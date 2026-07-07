import Phaser from "phaser";
import { characterAnimKey } from "../art/character_anims";
import { getCharacterKeyForProcessRole } from "../art/characters";
import { GAME_HEIGHT, GAME_WIDTH, PALETTE, PROCESS_ROLES } from "../game/constants";
import type { ProcessRoleId } from "../game/constants";
import { FRUS_QUEST_FIRST_ACTION } from "../game/mission";
import { gameState, setLatestMessage, setPlayerProfile, setSceneState, setVisibleEntities } from "../game/state";
import { bindPointerDown, getInput, tickInput } from "../input/InputState";
import { retroAudio } from "../systems/audio";
import { transitionTo } from "../systems/sceneTransitions";
import { CHARACTER_CREATE_RANK_COPY, CHARACTER_CREATE_TITLE } from "./characterCreateCopy";
import { normalizeCharacterDisplayName, shouldConfirmCharacterCreateInput } from "./characterCreateInput";

function color(hex: string) {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

function abilityCode(roleId: ProcessRoleId) {
  if (roleId === "compiler") return "ARCH";
  if (roleId === "editor") return "EDIT";
  if (roleId === "declass_reviewer") return "EQTY";
  if (roleId === "proofreader") return "READ";
  return "SRC";
}

function roleCardLabel(roleId: ProcessRoleId) {
  if (roleId === "declass_reviewer") return "DECLASS\nCOORD";
  if (roleId === "source_note_specialist") return "SOURCE\nNOTE";
  if (roleId === "proofreader") return "PROOF";
  return PROCESS_ROLES.find((role) => role.id === roleId)?.label.toUpperCase() ?? roleId.toUpperCase();
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
  private abilityCrest?: Phaser.GameObjects.Container;
  private abilityCrestRole?: ProcessRoleId;
  private locked = false;
  private nameFocused = false;
  private ngPlusBadge?: Phaser.GameObjects.Text;

  constructor() {
    super("CharacterCreateScene");
  }

  create() {
    setSceneState("CharacterCreateScene", "choice", "Choose an equal-rank FRUS production role.");
    const initialSelection = this.readInitialSelection();
    this.roleIndex = initialSelection.roleIndex;
    this.displayName = initialSelection.displayName;
    this.locked = false;
    this.nameFocused = false;
    this.cards = [];
    retroAudio.startMusic("CharacterCreateScene");
    setVisibleEntities(PROCESS_ROLES.map((role) => role.label));
    this.cameras.main.setBackgroundColor(PALETTE.shadowNavy);
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, color(PALETTE.shadowNavy)).setDepth(-100);
    this.add.rectangle(128, 18, 238, 22, color(PALETTE.buckramRed)).setStrokeStyle(2, color(PALETTE.goldStamp));
    this.add.text(128, 10, CHARACTER_CREATE_TITLE, {
      fontFamily: "monospace",
      fontSize: "10px",
      color: PALETTE.goldStamp
    }).setName("character-create-title").setOrigin(0.5, 0);
    this.add.text(128, 26, CHARACTER_CREATE_RANK_COPY, {
      fontFamily: "monospace",
      fontSize: "4px",
      color: PALETTE.creamPaper
    }).setName("character-create-equal-rank-copy").setOrigin(0.5, 0);

    this.drawSnesRoleStage();
    this.sprite = this.add
      .sprite(128, 70, this.characterKeyForRole(PROCESS_ROLES[this.roleIndex].id))
      .setName("character-create-role-preview-sprite")
      .setDepth(10)
      .setOrigin(0.5, 0.9);
    bindPointerDown(this.sprite, () => this.confirm());
    this.nameText = this.add.text(128, 94, "", {
      fontFamily: "monospace",
      fontSize: "8px",
      color: PALETTE.creamPaper
    }).setOrigin(0.5).setDepth(12);
    this.nameBox = this.add.rectangle(128, 97, 118, 15, color(PALETTE.black), 0.55)
      .setStrokeStyle(1, color(PALETTE.sepiaInk))
      .setDepth(this.nameText.depth - 1);
    bindPointerDown(this.nameBox, () => this.focusNameField());
    bindPointerDown(this.nameText, () => this.focusNameField());
    this.roleText = this.add.text(128, 108, "", {
      fontFamily: "monospace",
      fontSize: "10px",
      color: PALETTE.terminalCyan
    }).setOrigin(0.5).setDepth(12);
    this.remitText = this.add.text(128, 116, "", {
      fontFamily: "monospace",
      fontSize: "5px",
      color: PALETTE.creamPaper,
      wordWrap: { width: 238, useAdvancedWrap: true },
      align: "center",
      lineSpacing: 0
    }).setOrigin(0.5, 0).setDepth(12);

    this.createRoleCards();
    if (gameState.ngPlusActive) {
      this.ngPlusBadge = this.add.text(128, 139, "NEW GAME+ VETERAN SKIN", {
        fontFamily: "monospace",
        fontSize: "5px",
        color: PALETTE.goldStamp
      }).setName("character-create-ng-plus-badge").setOrigin(0.5);
    }
    this.beginPrompt = this.add.text(128, 203, "PICK ANY ROLE - SAME QUEST", {
      fontFamily: "monospace",
      fontSize: "5px",
      color: PALETTE.terminalCyan
    }).setName("character-create-begin-summary").setOrigin(0.5);
    this.add.text(128, 212, "A / TAP PREVIEW TO BEGIN", {
      fontFamily: "monospace",
      fontSize: "4px",
      color: PALETTE.goldStamp
    }).setName("character-create-begin-controls").setOrigin(0.5);
    this.add.text(128, 220, FRUS_QUEST_FIRST_ACTION, {
      fontFamily: "monospace",
      fontSize: "4px",
      color: PALETTE.creamPaper
    }).setName("character-create-first-action").setOrigin(0.5);
    bindPointerDown(
      this.add.zone(128, 211, 190, 28).setName("character-create-begin-touch-zone").setDepth(30),
      () => this.confirm()
    );

    this.renderSelection();
  }

  private drawSnesRoleStage() {
    this.add.rectangle(128, 68, 86, 68, color(PALETTE.black), 0.48)
      .setName("character-create-snes-stage-shadow")
      .setDepth(-6);
    this.add.rectangle(128, 66, 80, 62, color(PALETTE.deepRuby), 0.92)
      .setName("character-create-snes-stage")
      .setStrokeStyle(2, color(PALETTE.goldStamp))
      .setDepth(-5);
    this.add.ellipse(128, 77, 48, 10, color(PALETTE.black), 0.62)
      .setName("character-create-role-shadow")
      .setDepth(-2);
  }

  private drawWorkflowRelicStrip() {
    this.add.rectangle(128, 133, 186, 16, color(PALETTE.black), 0.8)
      .setName("character-create-workflow-strip")
      .setStrokeStyle(1, color(PALETTE.goldStamp));
    const relics = [
      { label: "SRC", x: 60, accent: PALETTE.archiveAmber },
      { label: "PEN", x: 94, accent: PALETTE.goldStamp },
      { label: "EQ", x: 128, accent: PALETTE.classNetRed },
      { label: "PROOF", x: 162, accent: PALETTE.terminalCyan },
      { label: "VOL", x: 196, accent: PALETTE.buckramHighlight }
    ] as const;
    for (const relic of relics) {
      this.add.rectangle(relic.x, 132, 24, 10, color(PALETTE.deepRuby), 0.92)
        .setName("character-create-workflow-relic")
        .setStrokeStyle(1, color(relic.accent));
      this.add.text(relic.x, 129, relic.label, {
        fontFamily: "monospace",
        fontSize: relic.label.length > 3 ? "4px" : "5px",
        color: relic.accent
      }).setName("character-create-workflow-relic-label").setOrigin(0.5, 0);
    }
  }

  private readInitialSelection() {
    const params = new URLSearchParams(window.location.search);
    const roleId = params.get("role") ?? gameState.playerProfile.roleId;
    const roleIndex = Math.max(0, PROCESS_ROLES.findIndex((role) => role.id === roleId));
    const queryName = params.get("name");
    const displayName = queryName === null
      ? gameState.playerProfile.displayName === "Sam" ? "" : gameState.playerProfile.displayName
      : normalizeCharacterDisplayName(queryName).slice(0, 10);
    return { roleIndex, displayName };
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
    const startX = 32;
    const stepX = 48;
    PROCESS_ROLES.forEach((role, index) => {
      const x = startX + index * stepX;
      const box = this.add.rectangle(0, 0, 44, 42, color(PALETTE.black)).setName("character-create-role-card-bg");
      const border = this.add.rectangle(0, 0, 44, 42)
        .setName("character-create-role-card-border")
        .setStrokeStyle(1, color(PALETTE.sepiaInk));
      const icon = this.add
        .sprite(0, 1, this.characterKeyForRole(role.id))
        .setName("character-create-role-card-sprite")
        .setOrigin(0.5, 0.9)
        .setScale(0.65);
      icon.play(characterAnimKey(this.characterKeyForRole(role.id), "idle-down"));
      const label = this.add.text(0, 7, roleCardLabel(role.id), {
        fontFamily: "monospace",
        fontSize: "5px",
        color: PALETTE.creamPaper,
        align: "center",
        wordWrap: { width: 42, useAdvancedWrap: true }
      }).setName("character-create-role-card-label").setOrigin(0.5, 0);
      const container = this.add.container(x, 168, [box, border, icon, label])
        .setName("character-create-role-card")
        .setSize(44, 42);
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
    const characterKey = this.characterKeyForRole(role.id);
    const roleAccent = PALETTE[role.color as keyof typeof PALETTE] ?? PALETTE.terminalCyan;
    this.sprite.setTexture(characterKey);
    this.sprite.play(characterAnimKey(characterKey, "idle-down"), true);
    this.abilityCrest?.destroy(true);
    this.abilityCrest = undefined;
    this.abilityCrestRole = undefined;
    const caretVisible = this.nameFocused && Math.floor(this.time.now / 350) % 2 === 0;
    this.nameText.setText(`NAME: ${this.displayName || "Sam"}${caretVisible ? "|" : ""}`);
    this.nameBox.setStrokeStyle(1, color(this.nameFocused ? PALETTE.goldStamp : PALETTE.sepiaInk));
    this.roleText.setText(role.label.toUpperCase()).setColor(roleAccent);
    this.remitText.setText(`${role.ability}: ${role.remit}`);
    this.cards.forEach((card, index) => {
      const border = card.list[1] as Phaser.GameObjects.Rectangle;
      border.setStrokeStyle(index === this.roleIndex ? 2 : 1, color(index === this.roleIndex ? PALETTE.goldStamp : PALETTE.sepiaInk));
      card.y = index === this.roleIndex ? 164 : 168;
    });
    this.beginPrompt.setAlpha(this.nameFocused ? 0.45 : 1);
    this.ngPlusBadge?.setAlpha(this.nameFocused ? 0.55 : 1);
    setLatestMessage(`Selected ${role.label}`);
  }

  private characterKeyForRole(roleId: string) {
    return getCharacterKeyForProcessRole(roleId, gameState.ngPlusActive);
  }

  private drawSelectedAbilityCrest(roleId: ProcessRoleId, accent: string) {
    if (this.abilityCrest && this.abilityCrestRole === roleId) return;
    this.abilityCrest?.destroy(true);
    this.abilityCrestRole = roleId;
    const container = this.add.container(203, 69).setName("character-create-role-ability-crest").setDepth(14);
    const add = <T extends Phaser.GameObjects.GameObject>(object: T, name: string) => {
      object.setName(name);
      container.add(object);
      return object;
    };
    add(this.add.rectangle(0, 0, 42, 54, color(PALETTE.black), 0.72), "character-create-role-ability-panel-shadow");
    add(this.add.rectangle(0, -1, 38, 50, color(PALETTE.deepRuby), 0.95), "character-create-role-ability-panel")
      .setStrokeStyle(1, color(accent));
    add(this.add.rectangle(0, -21, 30, 7, color(PALETTE.shadowNavy), 0.96), "character-create-role-ability-header")
      .setStrokeStyle(1, color(PALETTE.goldStamp));
    add(this.add.text(0, -24, "ABILITY", {
      fontFamily: "monospace",
      fontSize: "4px",
      color: PALETTE.goldStamp
    }).setOrigin(0.5, 0), "character-create-role-ability-title");

    this.drawAbilityGlyph(add, roleId, accent);
    add(this.add.text(0, 17, abilityCode(roleId), {
      fontFamily: "monospace",
      fontSize: "5px",
      color: accent
    }).setOrigin(0.5, 0), "character-create-role-ability-code");
    this.abilityCrest = container;
  }

  private drawAbilityGlyph(
    add: <T extends Phaser.GameObjects.GameObject>(object: T, name: string) => T,
    roleId: ProcessRoleId,
    accent: string
  ) {
    add(this.add.ellipse(0, 10, 28, 6, color(PALETTE.black), 0.54), "character-create-role-ability-shadow");

    if (roleId === "compiler") {
      // Folder + glasses glint: Archive Sense.
      add(this.add.rectangle(-2, -3, 24, 18, color(PALETTE.archiveAmber)), "character-create-role-ability-folder")
        .setStrokeStyle(1, color(PALETTE.black));
      add(this.add.rectangle(-8, -11, 10, 5, color(PALETTE.goldStamp)), "character-create-role-ability-folder-tab");
      add(this.add.rectangle(-7, -2, 7, 5).setStrokeStyle(1, color(PALETTE.white)), "character-create-role-ability-glasses-left");
      add(this.add.rectangle(5, -2, 7, 5).setStrokeStyle(1, color(PALETTE.white)), "character-create-role-ability-glasses-right");
      add(this.add.rectangle(-1, -2, 4, 1, color(PALETTE.white)), "character-create-role-ability-glasses-bridge");
      add(this.add.rectangle(12, -10, 2, 2, color(PALETTE.terminalCyan)), "character-create-role-ability-glint");
      return;
    }

    if (roleId === "declass_reviewer") {
      // Clipboard, mug, and agency seal pixels: Equity Map.
      add(this.add.rectangle(-3, -4, 20, 22, color(PALETTE.stoneGray)), "character-create-role-ability-clipboard")
        .setStrokeStyle(1, color(PALETTE.black));
      add(this.add.rectangle(-3, -15, 10, 4, color(PALETTE.goldStamp)), "character-create-role-ability-clip");
      for (const y of [-8, -3, 2]) {
        add(this.add.rectangle(-3, y, 12, 1, color(PALETTE.creamPaper)), "character-create-role-ability-clipboard-line");
      }
      add(this.add.rectangle(11, 4, 8, 8, color(PALETTE.creamPaper)), "character-create-role-ability-mug")
        .setStrokeStyle(1, color(PALETTE.black));
      add(this.add.rectangle(5, -2, 4, 4, color(PALETTE.classNetRed)), "character-create-role-ability-seal-red");
      add(this.add.rectangle(9, -8, 4, 4, color(PALETTE.terminalCyan)), "character-create-role-ability-seal-cyan");
      return;
    }

    if (roleId === "editor") {
      // Diagonal red pencil over copy: Red Pencil.
      add(this.add.rectangle(-5, 0, 18, 20, color(PALETTE.creamPaper)), "character-create-role-ability-copy")
        .setStrokeStyle(1, color(PALETTE.black));
      add(this.add.rectangle(-4, -4, 10, 1, color(PALETTE.sepiaInk)), "character-create-role-ability-copy-line");
      add(this.add.rectangle(-2, 2, 9, 1, color(PALETTE.sepiaInk)), "character-create-role-ability-copy-line");
      const pencil = add(this.add.rectangle(4, -2, 5, 26, color(PALETTE.buckramHighlight)), "character-create-role-ability-pencil");
      pencil.setRotation(-0.74);
      const pencilTip = add(this.add.triangle(13, -11, 0, 4, 4, 0, 8, 4, color(PALETTE.goldStamp)), "character-create-role-ability-pencil-tip");
      pencilTip.setRotation(-0.74);
      add(this.add.rectangle(3, 10, 16, 2, color(PALETTE.classNetRed)), "character-create-role-ability-red-mark");
      return;
    }

    if (roleId === "proofreader") {
      // Two proof pages with a lens pixel: Silent Read.
      add(this.add.rectangle(-6, -1, 14, 20, color(PALETTE.creamPaper)), "character-create-role-ability-proof-left")
        .setStrokeStyle(1, color(PALETTE.black));
      add(this.add.rectangle(5, 1, 14, 20, color(PALETTE.white)), "character-create-role-ability-proof-right")
        .setStrokeStyle(1, color(PALETTE.black));
      add(this.add.rectangle(-7, -7, 6, 1, color(PALETTE.sepiaInk)), "character-create-role-ability-proof-line");
      add(this.add.rectangle(4, -5, 7, 1, color(PALETTE.sepiaInk)), "character-create-role-ability-proof-line");
      add(this.add.circle(8, 8, 4).setStrokeStyle(1, color(PALETTE.terminalCyan)), "character-create-role-ability-lens");
      add(this.add.rectangle(12, 12, 5, 1, color(PALETTE.terminalCyan)).setRotation(0.75), "character-create-role-ability-lens-handle");
      return;
    }

    // Source-note specialist: stamp handle + source-note card.
    add(this.add.rectangle(-6, 0, 18, 20, color(PALETTE.creamPaper)), "character-create-role-ability-source-card")
      .setStrokeStyle(1, color(PALETTE.black));
    add(this.add.rectangle(-13, 0, 2, 16, color(PALETTE.buckramHighlight)), "character-create-role-ability-margin-bar");
    add(this.add.rectangle(-4, -6, 9, 1, color(PALETTE.sepiaInk)), "character-create-role-ability-source-line");
    add(this.add.rectangle(-2, 0, 7, 1, color(PALETTE.sepiaInk)), "character-create-role-ability-source-line");
    add(this.add.rectangle(9, -9, 8, 7, color(PALETTE.deepBrown)), "character-create-role-ability-stamp-handle")
      .setStrokeStyle(1, color(PALETTE.black));
    add(this.add.rectangle(9, -1, 13, 5, color(PALETTE.goldStamp)), "character-create-role-ability-stamp-base")
      .setStrokeStyle(1, color(PALETTE.black));
    add(this.add.rectangle(9, 6, 15, 3, color(PALETTE.classNetRed)), "character-create-role-ability-ink-pad");
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
