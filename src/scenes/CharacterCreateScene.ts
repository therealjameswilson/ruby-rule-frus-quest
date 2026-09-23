import Phaser from "phaser";
import { characterAnimKey } from "../art/character_anims";
import { COMPILER_APPEARANCES, getCharacterKeyForProcessRole } from "../art/characters";
import { DEFAULT_PROCESS_ROLE as COMPILER_ROLE, GAME_HEIGHT, GAME_WIDTH, PALETTE } from "../game/constants";
import { gameState, setLatestMessage, setPlayerProfile, setSceneState, setVisibleEntities } from "../game/state";
import { bindPointerDown, getInput, tickInput, isTouchInputCapable } from "../input/InputState";
import { CompilerNameInput } from "../input/CompilerNameInput";
import { retroAudio } from "../systems/audio";
import { transitionTo } from "../systems/sceneTransitions";
import {
  CHARACTER_CREATE_TITLE,
  FRUS_COMPILER_ROLE_ID
} from "./characterCreateCopy";
import { normalizeCharacterDisplayName, shouldConfirmCharacterCreateInput, shouldEndCharacterNameEditing } from "./characterCreateInput";

function color(hex: string) {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

export class CharacterCreateScene extends Phaser.Scene {
  private displayName = "";
  private appearanceIndex = 0;
  private appearanceText!: Phaser.GameObjects.Text;
  private nameText!: Phaser.GameObjects.Text;
  private nameBox!: Phaser.GameObjects.Rectangle;
  private beginPrompt!: Phaser.GameObjects.Text;
  private sprite!: Phaser.GameObjects.Sprite;
  private locked = false;
  private nameFocused = false;
  private nativeNameInput = new CompilerNameInput();
  private ngPlusBadge?: Phaser.GameObjects.Text;

  constructor() {
    super("CharacterCreateScene");
  }

  create() {
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.nativeNameInput.destroy());
    setSceneState("CharacterCreateScene", "choice", "Name your FRUS Compiler and begin the volume.");
    this.displayName = this.readInitialName();
    this.appearanceIndex = Math.max(0, COMPILER_APPEARANCES.findIndex(option => option.key === gameState.playerProfile.compilerAppearance));
    this.locked = false;
    this.nameFocused = false;
    retroAudio.startMusic("CharacterCreateScene");
    setVisibleEntities(["FRUS Compiler", "Compiler name field", "Begin FRUS Quest"]);

    this.cameras.main.setBackgroundColor(PALETTE.deepRuby);
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, color(PALETTE.deepRuby)).setDepth(-100);
    this.add.rectangle(128, 18, 224, 24, color(PALETTE.buckramRed))
      .setName("character-create-title-panel")
      .setStrokeStyle(2, color(PALETTE.goldStamp));
    this.add.text(128, 9, CHARACTER_CREATE_TITLE, {
      fontFamily: "monospace",
      fontSize: "8px",
      color: PALETTE.goldStamp
    }).setName("character-create-title").setOrigin(0.5, 0);
    this.drawCompilerStage();
    const characterKey = this.compilerCharacterKey();
    this.sprite = this.add.sprite(128, 91, characterKey)
      .setName("character-create-compiler-preview")
      .setDepth(10)
      .setScale(1.25)
      .setOrigin(0.5, 0.9);
    this.sprite.play(characterAnimKey(characterKey, "idle-down"));
    bindPointerDown(this.sprite, () => this.cycleAppearance(1));
    for (const [x, step, label] of [[43, -1, "<"], [213, 1, ">"]] as const) {
      const button = this.add.rectangle(x, 77, 44, 44, color(PALETTE.black), 0.8)
        .setStrokeStyle(2, color(PALETTE.goldStamp)).setDepth(11)
        .setName(step < 0 ? "compiler-previous" : "compiler-next");
      this.add.text(x, 77, label, { fontFamily: "monospace", fontSize: "22px", color: PALETTE.goldStamp })
        .setOrigin(0.5).setDepth(12);
      bindPointerDown(button, () => this.cycleAppearance(step));
    }
    this.appearanceText = this.add.text(128, 103, "", { fontFamily: "monospace", fontSize: "7px", color: PALETTE.creamPaper })
      .setOrigin(0.5).setDepth(12).setName("compiler-appearance-label");
    this.renderAppearance();

    this.nameBox = this.add.rectangle(128, 124, 136, 17, color(PALETTE.black), 0.72)
      .setName("character-create-name-box")
      .setStrokeStyle(1, color(PALETTE.sepiaInk))
      .setDepth(11);
    this.nameText = this.add.text(128, 120, "", {
      fontFamily: "monospace",
      fontSize: "8px",
      color: PALETTE.creamPaper
    }).setName("character-create-name").setOrigin(0.5, 0).setDepth(12);
    bindPointerDown(this.nameBox, () => this.focusNameField());
    bindPointerDown(this.nameText, () => this.focusNameField());

    this.add.rectangle(128, 151, 210, 30, color(PALETTE.black), 0.62)
      .setName("character-create-compiler-mission-panel")
      .setStrokeStyle(1, color(PALETTE.goldStamp));
    this.add.text(128, 140, "ARCHIVE SENSE", {
      fontFamily: "monospace",
      fontSize: "8px",
      color: PALETTE.goldStamp
    }).setName("character-create-compiler-ability").setOrigin(0.5, 0);
    this.add.text(128, 153, "FIND SOURCES. VERIFY. PUBLISH.", {
      fontFamily: "monospace",
      fontSize: "8px",
      color: PALETTE.creamPaper
    }).setName("character-create-compiler-remit").setOrigin(0.5, 0);
    if (gameState.ngPlusActive) {
      this.ngPlusBadge = this.add.text(128, 170, "NEW GAME+ VETERAN COMPILER", {
        fontFamily: "monospace",
        fontSize: "8px",
        color: PALETTE.goldStamp
      }).setName("character-create-ng-plus-badge").setOrigin(0.5, 0);
    }

    this.add.rectangle(128, 188, 176, 23, color(PALETTE.black), 0.76)
      .setName("character-create-begin-panel")
      .setStrokeStyle(1, color(PALETTE.goldStamp));
    this.beginPrompt = this.add.text(128, 184, "BEGIN THE FRUS QUEST", {
      fontFamily: "monospace",
      fontSize: "8px",
      color: PALETTE.goldStamp
    }).setName("character-create-begin-summary").setOrigin(0.5, 0);
    this.add.text(128, 207, "TAP / Z / ENTER", {
      fontFamily: "monospace",
      fontSize: "8px",
      color: PALETTE.creamPaper
    }).setName("character-create-begin-controls").setOrigin(0.5, 0);
    bindPointerDown(
      this.add.zone(128, 192, 196, 38).setName("character-create-begin-touch-zone").setDepth(30),
      () => this.confirm()
    );

    this.renderName();
  }

  update() {
    tickInput();
    const input = getInput();
    if (this.nameFocused) {
      if (shouldEndCharacterNameEditing(input)) {
        this.blurNameField();
        return;
      }
      if (input.backspaceJustPressed) this.backspaceName();
      for (const letter of input.typedText) this.handleTypedLetter(letter);
    } else if (input.leftJustPressed || input.rightJustPressed) {
      this.cycleAppearance(input.leftJustPressed ? -1 : 1);
    } else if (shouldConfirmCharacterCreateInput(input)) {
      this.confirm();
    }
    this.renderName();
  }

  private drawCompilerStage() {
    this.add.rectangle(128, 82, 102, 88, color(PALETTE.black), 0.5)
      .setName("character-create-compiler-stage-shadow")
      .setDepth(-6);
    this.add.rectangle(128, 79, 94, 82, color(PALETTE.shadowNavy), 0.96)
      .setName("character-create-compiler-stage")
      .setStrokeStyle(2, color(PALETTE.goldStamp))
      .setDepth(-5);
    this.add.ellipse(128, 99, 52, 10, color(PALETTE.black), 0.62)
      .setName("character-create-compiler-shadow")
      .setDepth(-2);
  }

  private readInitialName() {
    const queryName = new URLSearchParams(window.location.search).get("name");
    if (queryName !== null) return normalizeCharacterDisplayName(queryName).slice(0, 10);
    return gameState.playerProfile.displayName === "Sam" ? "" : gameState.playerProfile.displayName;
  }

  private backspaceName() {
    if (this.locked) return;
    this.displayName = this.displayName.slice(0, -1);
    this.renderName();
  }

  private handleTypedLetter(letter: string) {
    if (this.locked) return;
    if (/^[a-zA-Z]$/.test(letter) && this.displayName.length < 10) {
      this.displayName += letter;
      this.renderName();
    }
  }

  private focusNameField() {
    if (this.locked) return;
    if (isTouchInputCapable()) {
      this.nativeNameInput.open(this.displayName, name => {
        if (name !== null) this.displayName = name;
        this.blurNameField();
      });
      return;
    }
    this.nameFocused = true;
    this.renderName();
  }

  private blurNameField() {
    this.nameFocused = false;
    this.renderName();
  }

  private renderName() {
    const caretVisible = this.nameFocused && Math.floor(this.time.now / 350) % 2 === 0;
    this.nameText.setText(`NAME: ${this.displayName || "Sam"}${caretVisible ? "|" : ""}`);
    this.nameBox.setStrokeStyle(1, color(this.nameFocused ? PALETTE.goldStamp : PALETTE.sepiaInk));
    this.beginPrompt.setAlpha(this.nameFocused ? 0.45 : 1);
    this.ngPlusBadge?.setAlpha(this.nameFocused ? 0.55 : 1);
    setLatestMessage("FRUS Compiler ready.");
  }

  private cycleAppearance(step: number) {
    if (this.locked || this.nameFocused || this.nativeNameInput.active) return;
    this.appearanceIndex = (this.appearanceIndex + step + COMPILER_APPEARANCES.length) % COMPILER_APPEARANCES.length;
    this.renderAppearance();
    retroAudio.blip();
  }

  private renderAppearance() {
    const key = this.compilerCharacterKey();
    this.sprite.setTexture(key);
    this.sprite.play(characterAnimKey(key, "idle-down"));
    this.appearanceText.setText(`${this.appearanceIndex + 1}/${COMPILER_APPEARANCES.length} ${COMPILER_APPEARANCES[this.appearanceIndex].label}`);
  }

  private compilerCharacterKey() {
    return getCharacterKeyForProcessRole(FRUS_COMPILER_ROLE_ID, gameState.ngPlusActive, COMPILER_APPEARANCES[this.appearanceIndex].key);
  }

  private confirm() {
    if (this.locked || this.nativeNameInput.active) return;
    this.locked = true;
    const displayName = normalizeCharacterDisplayName(this.displayName);
    retroAudio.confirm();
    setPlayerProfile(displayName, COMPILER_ROLE, COMPILER_APPEARANCES[this.appearanceIndex].key);
    transitionTo(this, "DanneIntroScene");
  }
}
