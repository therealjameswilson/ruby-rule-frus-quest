import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, PALETTE, PROCESS_ROLES } from "../game/constants";
import { setLatestMessage, setPlayerProfile, setSceneState, setVisibleEntities } from "../game/state";
import { retroAudio } from "../systems/audio";
import { transitionTo } from "../systems/sceneTransitions";

function color(hex: string) {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

export class CharacterCreateScene extends Phaser.Scene {
  private roleIndex = 0;
  private displayName = "Sam";
  private nameText!: Phaser.GameObjects.Text;
  private roleText!: Phaser.GameObjects.Text;
  private remitText!: Phaser.GameObjects.Text;
  private sprite!: Phaser.GameObjects.Image;
  private cards: Phaser.GameObjects.Container[] = [];
  private locked = false;

  constructor() {
    super("CharacterCreateScene");
  }

  create() {
    setSceneState("CharacterCreateScene", "choice", "Craft your FRUS production character.");
    retroAudio.startMusic("CharacterCreateScene");
    setVisibleEntities(PROCESS_ROLES.map((role) => role.label));
    this.cameras.main.setBackgroundColor(PALETTE.shadowNavy);
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, color(PALETTE.shadowNavy));
    this.add.rectangle(128, 18, 238, 22, color(PALETTE.buckramRed)).setStrokeStyle(2, color(PALETTE.goldStamp));
    this.add.text(128, 12, "CREATE YOUR HISTORIAN", {
      fontFamily: "monospace",
      fontSize: "10px",
      color: PALETTE.goldStamp
    }).setOrigin(0.5);

    this.sprite = this.add.image(128, 54, PROCESS_ROLES[this.roleIndex].spriteKey).setScale(2);
    this.nameText = this.add.text(128, 80, "", {
      fontFamily: "monospace",
      fontSize: "8px",
      color: PALETTE.creamPaper
    }).setOrigin(0.5);
    this.roleText = this.add.text(128, 96, "", {
      fontFamily: "monospace",
      fontSize: "10px",
      color: PALETTE.terminalCyan
    }).setOrigin(0.5);
    this.remitText = this.add.text(128, 110, "", {
      fontFamily: "monospace",
      fontSize: "7px",
      color: PALETTE.creamPaper,
      wordWrap: { width: 218, useAdvancedWrap: true },
      align: "center"
    }).setOrigin(0.5, 0);

    this.createRoleCards();
    this.add.text(128, 212, "TYPE NAME  LEFT/RIGHT ROLE  ENTER CONFIRMS", {
      fontFamily: "monospace",
      fontSize: "6px",
      color: PALETTE.goldStamp
    }).setOrigin(0.5);

    this.input.keyboard?.on("keydown-LEFT", this.previousRole, this);
    this.input.keyboard?.on("keydown-RIGHT", this.nextRole, this);
    this.input.keyboard?.on("keydown-BACKSPACE", this.backspaceName, this);
    this.input.keyboard?.on("keydown-ENTER", this.confirm, this);
    this.input.keyboard?.on("keydown-SPACE", this.confirm, this);
    this.input.keyboard?.on("keydown", this.handleTypedLetter, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off("keydown-LEFT", this.previousRole, this);
      this.input.keyboard?.off("keydown-RIGHT", this.nextRole, this);
      this.input.keyboard?.off("keydown-BACKSPACE", this.backspaceName, this);
      this.input.keyboard?.off("keydown-ENTER", this.confirm, this);
      this.input.keyboard?.off("keydown-SPACE", this.confirm, this);
      this.input.keyboard?.off("keydown", this.handleTypedLetter, this);
    });
    this.renderSelection();
  }

  private createRoleCards() {
    const startX = 26;
    PROCESS_ROLES.forEach((role, index) => {
      const x = startX + index * 51;
      const box = this.add.rectangle(0, 0, 44, 42, color(PALETTE.black), 0.9);
      const border = this.add.rectangle(0, 0, 44, 42).setStrokeStyle(1, color(PALETTE.sepiaInk));
      const icon = this.add.image(0, -11, role.spriteKey).setScale(2);
      const label = this.add.text(0, 7, role.label.toUpperCase().replace(" ", "\n"), {
        fontFamily: "monospace",
        fontSize: "5px",
        color: PALETTE.creamPaper,
        align: "center"
      }).setOrigin(0.5, 0);
      const container = this.add.container(x, 160, [box, border, icon, label]);
      container.setSize(44, 42).setInteractive({ useHandCursor: true }).on("pointerdown", () => {
        this.roleIndex = index;
        this.renderSelection();
      });
      this.cards.push(container);
    });
  }

  private previousRole() {
    if (this.locked) return;
    this.roleIndex = Phaser.Math.Wrap(this.roleIndex - 1, 0, PROCESS_ROLES.length);
    this.renderSelection();
  }

  private nextRole() {
    if (this.locked) return;
    this.roleIndex = Phaser.Math.Wrap(this.roleIndex + 1, 0, PROCESS_ROLES.length);
    this.renderSelection();
  }

  private backspaceName() {
    if (this.locked) return;
    this.displayName = this.displayName.slice(0, -1);
    this.renderSelection();
  }

  private handleTypedLetter(event: KeyboardEvent) {
    if (this.locked) return;
    if (/^[a-zA-Z]$/.test(event.key) && this.displayName.length < 10) {
      if (this.displayName === "Sam") this.displayName = "";
      this.displayName += event.key;
      this.renderSelection();
    }
  }

  private renderSelection() {
    const role = PROCESS_ROLES[this.roleIndex];
    this.sprite.setTexture(role.spriteKey);
    this.nameText.setText(`NAME: ${this.displayName || "Historian"}`);
    this.roleText.setText(role.label.toUpperCase());
    this.remitText.setText(`${role.ability}: ${role.remit}`);
    this.cards.forEach((card, index) => {
      const border = card.list[1] as Phaser.GameObjects.Rectangle;
      border.setStrokeStyle(index === this.roleIndex ? 2 : 1, color(index === this.roleIndex ? PALETTE.goldStamp : PALETTE.sepiaInk));
      card.y = index === this.roleIndex ? 154 : 160;
    });
    setLatestMessage(`Selected ${role.label}`);
  }

  private confirm() {
    this.locked = true;
    const role = PROCESS_ROLES[this.roleIndex];
    const cleanedName = this.displayName.trim() || "Historian";
    const displayName = cleanedName.charAt(0).toUpperCase() + cleanedName.slice(1);
    retroAudio.confirm();
    setPlayerProfile(displayName, role);
    transitionTo(this, "GuideScene");
  }
}
