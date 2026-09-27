import { heroCharacterKey, characterTextureDensity } from "../art/characters";
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
  private appearanceCards: Phaser.GameObjects.Rectangle[] = [];
  private appearanceMarkers: Phaser.GameObjects.Text[] = [];

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
    this.appearanceCards = [];
    this.appearanceMarkers = [];
    retroAudio.startMusic("CharacterCreateScene");
    setVisibleEntities(["FRUS Compiler", "Compiler name field", "Begin FRUS Quest"]);

    this.cameras.main.setBackgroundColor('#101e26');
    const backdrop = this.add.graphics().setDepth(-100);
    backdrop.fillGradientStyle(0x2c4548,0x182b34,0x101b24,0x101b24,1);
    backdrop.fillRect(0,0,GAME_WIDTH,GAME_HEIGHT);
    for(let x=12;x<GAME_WIDTH;x+=18)this.add.rectangle(x,120,1,220,0xc8d1af,0.025).setDepth(-99);
    this.add.rectangle(128, 18, 224, 24, 0x24383e)
      .setName("character-create-title-panel")
      .setStrokeStyle(1, 0x59716c);
    this.add.text(128, 9, CHARACTER_CREATE_TITLE, {
      fontFamily: "monospace",
      fontSize: "8px",
      color: PALETTE.goldStamp
    }).setName("character-create-title").setOrigin(0.5, 0);
    this.drawCompilerStage();
    const characterKey = this.compilerCharacterKey();
    this.sprite = this.add.sprite(65, 94, characterKey)
      .setName("character-create-compiler-preview")
      .setDepth(10)
      .setScale(1.25)
      .setOrigin(0.5, 0.9);
    this.sprite.play(characterAnimKey(characterKey, "idle-down"));
    bindPointerDown(this.sprite, () => this.cycleAppearance(1));
    this.drawAppearanceGallery();
    this.appearanceText = this.add.text(65, 106, "", { fontFamily: "Arial", fontSize: "7px", color: '#eddbab' })
      .setOrigin(0.5).setDepth(12).setResolution(3).setName("compiler-appearance-label");
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
    this.add.text(128, 140, "ONE VOLUME. YOUR JUDGMENT.", {
      fontFamily: "monospace",
      fontSize: "8px",
      color: PALETTE.goldStamp
    }).setName("character-create-compiler-ability").setOrigin(0.5, 0);
    this.add.text(128, 153, "RESEARCH · SELECT · ANNOTATE · REVISE", {
      fontFamily: "monospace",
      fontSize: "6px",
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
    this.add.text(128, 207, isTouchInputCapable() ? "TAP PORTRAIT / NAME / BEGIN" : "ARROWS CHOOSE · ENTER BEGINS", {
      fontFamily: "monospace",
      fontSize: "8px",
      color: PALETTE.creamPaper
    }).setName("character-create-begin-controls").setOrigin(0.5, 0);
    bindPointerDown(
      this.add.zone(128, 192, 196, 38).setName("character-create-begin-touch-zone").setDepth(30),
      () => this.confirm()
    );

    this.children.list.forEach(child=>{if(child instanceof Phaser.GameObjects.Text)child.setResolution(3);});
    this.renderName();
  }

  update() {
    tickInput();
    const input = getInput();
    if (this.nameFocused) {
      // Preserve the final letters even when Enter arrives in the same frame.
      if (input.backspaceJustPressed) this.backspaceName();
      for (const letter of input.typedText) this.handleTypedLetter(letter);
      if (shouldEndCharacterNameEditing(input)) {
        this.blurNameField();
        return;
      }
    } else if (input.navLeftJustPressed || input.navRightJustPressed) {
      this.cycleAppearance(input.navLeftJustPressed ? -1 : 1);
    } else if (input.navUpJustPressed || input.navDownJustPressed) {
      this.cycleAppearance(input.navUpJustPressed ? -3 : 3);
    } else if (shouldConfirmCharacterCreateInput(input)) {
      this.confirm();
    }
    this.renderName();
  }

  private drawCompilerStage() {
    this.add.rectangle(65,76,96,78,0x0b151d,0.6).setDepth(-6);
    this.add.rectangle(65,75,90,76,0x273e42).setName("character-create-compiler-stage")
      .setStrokeStyle(1,0x718078).setDepth(-5);
    this.add.ellipse(65,96,54,10,0x050c12,0.5).setDepth(-2);
    this.add.text(65,42,"YOUR COMPILER",{fontFamily:"Arial",fontSize:"5px",color:'#acc1bb'})
      .setOrigin(0.5).setResolution(3);
  }

  private drawAppearanceGallery() {
    COMPILER_APPEARANCES.forEach((option,index)=>{
      const x=138+(index%3)*40,y=55+Math.floor(index/3)*40;
      const card=this.add.rectangle(x,y,36,36,0x203238).setStrokeStyle(1,0x526963)
        .setName(`compiler-appearance-${index}`).setDepth(11);
      this.appearanceCards.push(card);
      const key=heroCharacterKey(getCharacterKeyForProcessRole(FRUS_COMPILER_ROLE_ID,gameState.ngPlusActive,option.key));
      this.add.sprite(x,y+14,key).setOrigin(0.5,0.9).setScale(0.62/characterTextureDensity(key))
        .setDepth(12).play(characterAnimKey(key,"idle-down"));
      const marker=this.add.text(x-15,y-16,"",{fontFamily:"Arial",fontSize:"6px",color:'#efdb9f'})
        .setDepth(13).setResolution(3);
      this.appearanceMarkers.push(marker);
      bindPointerDown(card,()=>this.selectAppearance(index));
    });
  }

  private selectAppearance(index:number) {
    if(this.locked||this.nameFocused||this.nativeNameInput.active)return;
    this.appearanceIndex=index;
    this.renderAppearance();
    retroAudio.blip();
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
    setLatestMessage(`Compiler appearance: ${COMPILER_APPEARANCES[this.appearanceIndex].label}. Name: ${this.displayName || "Sam"}.`);
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
    this.sprite.setScale(1.25 / characterTextureDensity(key));
    this.sprite.play(characterAnimKey(key, "idle-down"));
    this.appearanceText.setText(COMPILER_APPEARANCES[this.appearanceIndex].label);
    this.appearanceCards.forEach((card,index)=>{
      const selected=index===this.appearanceIndex;
      card.setFillStyle(selected?0x526b61:0x203238).setStrokeStyle(selected?2:1,selected?0xecd398:0x526963);
      this.appearanceMarkers[index].setText(selected?'✓':'');
    });
  }

  private compilerCharacterKey() {
    return heroCharacterKey(getCharacterKeyForProcessRole(FRUS_COMPILER_ROLE_ID, gameState.ngPlusActive, COMPILER_APPEARANCES[this.appearanceIndex].key));
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
