import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, PALETTE } from "../game/constants";
import { setSceneState } from "../game/state";
import { addInputGestureListener, bindPointerPress, getInput, tickInput } from "../input/InputState";
import { retroAudio } from "../systems/audio";
import { clearSavedGame, getSavedGameSummary, loadSavedGame } from "../systems/save";

function color(hex: string) {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

export class TapToStartScene extends Phaser.Scene {
  private started = false;
  private removeGestureListener?: () => void;
  private hasSave = false;
  private selectedAction: "continue" | "new" = "continue";
  private continueText?: Phaser.GameObjects.Text;
  private newGameText?: Phaser.GameObjects.Text;

  constructor() {
    super("TapToStartScene");
  }

  create() {
    setSceneState("TapToStartScene", "title", "Tap or press start to unlock audio.");
    const saveSummary = getSavedGameSummary();
    this.hasSave = Boolean(saveSummary);
    this.cameras.main.setBackgroundColor(PALETTE.black);
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, color(PALETTE.black));
    for (let y = 8; y < GAME_HEIGHT; y += 12) {
      for (let x = (y / 12) % 2 === 0 ? 8 : 14; x < GAME_WIDTH; x += 24) {
        this.add.rectangle(x, y, 2, 2, color(PALETTE.deepRuby));
      }
    }
    this.add.rectangle(128, 96, 178, 70, color(PALETTE.deepRuby)).setStrokeStyle(2, color(PALETTE.goldStamp));
    this.add.text(128, 76, "RUBY RULE", {
      fontFamily: "monospace",
      fontSize: "18px",
      color: PALETTE.goldStamp
    }).setOrigin(0.5);
    this.add.text(128, 104, this.hasSave ? "CONTINUE QUEST?" : "PRESS START", {
      fontFamily: "monospace",
      fontSize: "12px",
      color: PALETTE.creamPaper
    }).setOrigin(0.5);
    this.add.text(128, 126, this.hasSave && saveSummary ? `${saveSummary.currentScene}  DOC ${saveSummary.documentPoints}` : "TAP ONCE TO UNLOCK SOUND", {
      fontFamily: "monospace",
      fontSize: "6px",
      color: PALETTE.terminalCyan
    }).setOrigin(0.5);
    if (this.hasSave) this.createSaveChoice();
    this.removeGestureListener = addInputGestureListener(() => {
      if (!this.hasSave) void this.startTitle();
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.removeGestureListener?.());
  }

  update() {
    tickInput();
    const input = getInput();
    if (this.hasSave) {
      if (input.navLeftJustPressed || input.navRightJustPressed) {
        this.selectedAction = this.selectedAction === "continue" ? "new" : "continue";
        this.renderChoice();
      }
      if (input.bJustPressed) {
        this.selectedAction = "new";
        this.renderChoice();
      }
      if (input.aJustPressed || input.startJustPressed || input.pointerPrimaryJustPressed) void this.confirmSaveChoice();
      return;
    }
    if (input.aJustPressed || input.startJustPressed || input.pointerPrimaryJustPressed) void this.startTitle();
  }

  private async startTitle() {
    if (this.started) return;
    this.started = true;
    this.removeGestureListener?.();
    await retroAudio.unlock();
    this.cameras.main.fadeOut(120, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start("TitleScene");
    });
  }

  private createSaveChoice() {
    const continueHit = this.add.rectangle(86, 154, 76, 32, color(PALETTE.black), 0.01);
    const newHit = this.add.rectangle(170, 154, 76, 32, color(PALETTE.black), 0.01);
    bindPointerPress(continueHit, {
      down: () => {
        this.selectedAction = "continue";
        void this.confirmSaveChoice();
      }
    });
    bindPointerPress(newHit, {
      down: () => {
        this.selectedAction = "new";
        void this.confirmSaveChoice();
      }
    });
    this.continueText = this.add.text(86, 154, "CONTINUE", {
      fontFamily: "monospace",
      fontSize: "8px",
      color: PALETTE.goldStamp
    }).setOrigin(0.5);
    this.newGameText = this.add.text(170, 154, "NEW GAME", {
      fontFamily: "monospace",
      fontSize: "8px",
      color: PALETTE.creamPaper
    }).setOrigin(0.5);
    this.add.text(128, 178, "LEFT/RIGHT SELECT  A CONFIRM", {
      fontFamily: "monospace",
      fontSize: "6px",
      color: PALETTE.creamPaper
    }).setOrigin(0.5);
    this.renderChoice();
  }

  private renderChoice() {
    this.continueText?.setColor(this.selectedAction === "continue" ? PALETTE.goldStamp : PALETTE.creamPaper);
    this.newGameText?.setColor(this.selectedAction === "new" ? PALETTE.goldStamp : PALETTE.creamPaper);
  }

  private async confirmSaveChoice() {
    if (this.started) return;
    this.started = true;
    this.removeGestureListener?.();
    await retroAudio.unlock();
    if (this.selectedAction === "new") {
      clearSavedGame();
      this.cameras.main.fadeOut(120, 0, 0, 0);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        this.scene.start("TitleScene");
      });
      return;
    }
    const sceneKey = loadSavedGame();
    this.cameras.main.fadeOut(120, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(sceneKey ?? "TitleScene");
    });
  }
}
