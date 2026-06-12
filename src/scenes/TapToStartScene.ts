import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, PALETTE } from "../game/constants";
import { setSceneState } from "../game/state";
import { addInputGestureListener, getInput, tickInput } from "../input/InputState";
import { retroAudio } from "../systems/audio";

function color(hex: string) {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

export class TapToStartScene extends Phaser.Scene {
  private started = false;
  private removeGestureListener?: () => void;

  constructor() {
    super("TapToStartScene");
  }

  create() {
    setSceneState("TapToStartScene", "title", "Tap or press start to unlock audio.");
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
    this.add.text(128, 104, "PRESS START", {
      fontFamily: "monospace",
      fontSize: "12px",
      color: PALETTE.creamPaper
    }).setOrigin(0.5);
    this.add.text(128, 126, "TAP ONCE TO UNLOCK SOUND", {
      fontFamily: "monospace",
      fontSize: "6px",
      color: PALETTE.terminalCyan
    }).setOrigin(0.5);
    this.removeGestureListener = addInputGestureListener(() => {
      void this.startTitle();
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.removeGestureListener?.());
  }

  update() {
    tickInput();
    const input = getInput();
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
}
