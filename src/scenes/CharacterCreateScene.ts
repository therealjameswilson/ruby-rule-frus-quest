import Phaser from "phaser";
import { characterAnimKey } from "../art/character_anims";
import { getCharacterKeyForProcessRole } from "../art/characters";
import { GAME_HEIGHT, GAME_WIDTH, PALETTE, PROCESS_ROLES } from "../game/constants";
import { setLatestMessage, setPlayerProfile, setSceneState, setVisibleEntities } from "../game/state";
import { bindPointerDown, getInput, tickInput } from "../input/InputState";
import { retroAudio } from "../systems/audio";
import { transitionTo } from "../systems/sceneTransitions";
import { normalizeCharacterDisplayName, shouldConfirmCharacterCreateInput } from "./characterCreateInput";

function color(hex: string) {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

export class CharacterCreateScene extends Phaser.Scene {
  private roleIndex = 0;
  private displayName = "";
  private nameText!: Phaser.GameObjects.Text;
  private nameBox!: Phaser.GameObjects.Rectangle;
  private beginPrompt!: Phaser.GameObjects.Text;
  private roleText!: Phaser.GameObjects.Text;
  private remitText!: Phaser.GameObjects.Text;
  private sprite!: Phaser.GameObjects.Sprite;
  private cards: Phaser.GameObjects.Container[] = [];
  private locked = false;
  private nameFocused = false;

  constructor() {
    super("CharacterCreateScene");
  }

  create() {
    setSceneState("CharacterCreateScene", "choice", "Craft your FRUS production character.");
    this.roleIndex = 0;
    this.displayName = "";
    this.locked = false;
    this.nameFocused = false;
    this.cards = [];
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

    this.sprite = this.add
      .sprite(128, 70, getCharacterKeyForProcessRole(PROCESS_ROLES[this.roleIndex].id))
      .setOrigin(0.5, 0.9);
    this.nameText = this.add.text(128, 94, "", {
      fontFamily: "monospace",
      fontSize: "8px",
      color: PALETTE.creamPaper
    }).setOrigin(0.5);
    this.nameBox = this.add.rectangle(128, 97, 118, 15, color(PALETTE.black), 0.55)
      .setStrokeStyle(1, color(PALETTE.sepiaInk))
      .setDepth(this.nameText.depth - 1);
    bindPointerDown(this.nameBox, () => this.focusNameField());
    bindPointerDown(this.nameText, () => this.focusNameField());
    this.roleText = this.add.text(128, 108, "", {
      fontFamily: "monospace",
      fontSize: "10px",
      color: PALETTE.terminalCyan
    }).setOrigin(0.5);
    this.remitText = this.add.text(128, 122, "", {
      fontFamily: "monospace",
      fontSize: "7px",
      color: PALETTE.creamPaper,
      wordWrap: { width: 218, useAdvancedWrap: true },
      align: "center"
    }).setOrigin(0.5, 0);

    this.createRoleCards();
    this.beginPrompt = this.add.text(128, 203, "PRESS ENTER / TAP AGAIN TO BEGIN", {
      fontFamily: "monospace",
      fontSize: "6px",
      color: PALETTE.terminalCyan
    }).setOrigin(0.5);
    this.add.text(128, 212, "TYPE NAME  LEFT/RIGHT ROLE  ENTER CONFIRMS", {
      fontFamily: "monospace",
      fontSize: "6px",
      color: PALETTE.goldStamp
    }).setOrigin(0.5);

    this.renderSelection();
  }

  update() {
    tickInput();
    const input = getInput();
    if (this.nameFocused) {
      if (input.confirmJustPressed) {
        this.blurNameField();
        return;
      }
      if (input.cancelJustPressed) this.blurNameField();
      if (input.backspaceJustPressed) this.backspaceName();
      for (const letter of input.typedText) this.handleTypedLetter(letter);
    } else {
      if (input.navLeftJustPressed) this.previousRole();
      if (input.navRightJustPressed) this.nextRole();
      if (input.navUpJustPressed) this.previousRole();
      if (input.navDownJustPressed) this.nextRole();
      if (shouldConfirmCharacterCreateInput(input)) this.confirm();
    }
    this.renderSelection();
  }

  private createRoleCards() {
    const startX = 26;
    PROCESS_ROLES.forEach((role, index) => {
      const x = startX + index * 51;
      const box = this.add.rectangle(0, 0, 44, 42, color(PALETTE.black));
      const border = this.add.rectangle(0, 0, 44, 42).setStrokeStyle(1, color(PALETTE.sepiaInk));
      const icon = this.add
        .sprite(0, 1, getCharacterKeyForProcessRole(role.id))
        .setOrigin(0.5, 0.9)
        .setScale(0.65);
      icon.play(characterAnimKey(getCharacterKeyForProcessRole(role.id), "idle-down"));
      const label = this.add.text(0, 7, role.label.toUpperCase().replace(" ", "\n"), {
        fontFamily: "monospace",
        fontSize: "5px",
        color: PALETTE.creamPaper,
        align: "center"
      }).setOrigin(0.5, 0);
      const container = this.add.container(x, 160, [box, border, icon, label]).setSize(44, 42);
      bindPointerDown(container, () => {
        if (this.locked) return;
        const alreadySelected = this.roleIndex === index;
        this.blurNameField();
        if (alreadySelected) {
          this.confirm();
          return;
        }
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

  private handleTypedLetter(letter: string) {
    if (this.locked) return;
    if (/^[a-zA-Z]$/.test(letter) && this.displayName.length < 10) {
      this.displayName += letter;
      this.renderSelection();
    }
  }

  private focusNameField() {
    if (this.locked) return;
    this.nameFocused = true;
    this.renderSelection();
  }

  private blurNameField() {
    this.nameFocused = false;
    this.renderSelection();
  }

  private renderSelection() {
    const role = PROCESS_ROLES[this.roleIndex];
    const characterKey = getCharacterKeyForProcessRole(role.id);
    this.sprite.setTexture(characterKey);
    this.sprite.play(characterAnimKey(characterKey, "idle-down"), true);
    const caretVisible = this.nameFocused && Math.floor(this.time.now / 350) % 2 === 0;
    this.nameText.setText(`NAME: ${this.displayName || "Sam"}${caretVisible ? "|" : ""}`);
    this.nameBox.setStrokeStyle(1, color(this.nameFocused ? PALETTE.goldStamp : PALETTE.sepiaInk));
    this.roleText.setText(role.label.toUpperCase());
    this.remitText.setText(`${role.ability}: ${role.remit}`);
    this.cards.forEach((card, index) => {
      const border = card.list[1] as Phaser.GameObjects.Rectangle;
      border.setStrokeStyle(index === this.roleIndex ? 2 : 1, color(index === this.roleIndex ? PALETTE.goldStamp : PALETTE.sepiaInk));
      card.y = index === this.roleIndex ? 154 : 160;
    });
    this.beginPrompt.setAlpha(this.nameFocused ? 0.45 : 1);
    setLatestMessage(`Selected ${role.label}`);
  }

  private confirm() {
    if (this.locked) return;
    this.locked = true;
    const role = PROCESS_ROLES[this.roleIndex];
    const displayName = normalizeCharacterDisplayName(this.displayName);
    retroAudio.confirm();
    setPlayerProfile(displayName, role);
    transitionTo(this, "OfficeScene");
  }
}
