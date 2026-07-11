import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, PALETTE } from "../game/constants";
import { setLatestMessage, setSceneState, setVisibleEntities } from "../game/state";
import { getSkipWarningPreference } from "../game/warningSettings";
import { getInput, swallowNextInputFrame, tickInput } from "../input/InputState";
import { retroAudio } from "../systems/audio";

function color(hex: string) {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

export class WarningScene extends Phaser.Scene {
  private started = false;

  constructor() {
    super("WarningScene");
  }

  create() {
    setSceneState("WarningScene", "title", "Fictional DANN-E warning before title.");
    setLatestMessage("DANN-E is a fictional rogue AI. Tap to continue.");
    setVisibleEntities(["DANN-E warning", "history.state.gov shoutout", "TAP / PRESS A"]);
    if (getSkipWarningPreference()) {
      this.scene.start("TitleScene");
      return;
    }

    this.cameras.main.setBackgroundColor(PALETTE.black);
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, color(PALETTE.black));
    this.drawSimpleWarningCard();
    this.cameras.main.fadeIn(600, 0, 0, 0);
    this.time.delayedCall(8000, () => void this.begin(false));
  }

  update() {
    if (this.started) return;
    tickInput();
    const input = getInput();
    const heldStart = input.a || input.start;
    const pressedStart = input.aJustPressed || input.startJustPressed || input.pointerPrimaryJustPressed;
    if (heldStart || pressedStart) {
      void this.begin(true);
    }
  }

  private drawSimpleWarningCard() {
    this.add.rectangle(128, 120, 188, 132, color(PALETTE.deepRuby), 0.96)
      .setName("warning-simple-card")
      .setStrokeStyle(2, color(PALETTE.goldStamp));
    this.add.rectangle(128, 91, 136, 1, color(PALETTE.goldStamp), 0.9)
      .setName("warning-simple-divider");
    this.add.text(128, 63, "DANN-E WARNING", {
      fontFamily: "monospace",
      fontSize: "9px",
      color: PALETTE.goldStamp,
      fontStyle: "bold"
    }).setName("warning-simple-title").setOrigin(0.5, 0).setResolution(2);
    this.add.rectangle(128, 106, 38, 26, color(PALETTE.black), 0.82)
      .setName("warning-simple-danne-head")
      .setStrokeStyle(1, color(PALETTE.stoneLight));
    this.add.rectangle(116, 105, 10, 2, color(PALETTE.classNetRed))
      .setName("warning-simple-danne-eye");
    this.add.rectangle(140, 105, 10, 2, color(PALETTE.classNetRed))
      .setName("warning-simple-danne-eye");
    this.add.circle(128, 119, 5, color(PALETTE.classNetRed), 0.9)
      .setName("warning-simple-danne-core");
    this.add.text(128, 139, "FICTIONAL ROGUE AI", {
      fontFamily: "monospace",
      fontSize: "6px",
      color: PALETTE.creamPaper
    }).setName("warning-simple-copy").setOrigin(0.5, 0).setResolution(2);
    this.add.text(128, 152, "IT PRESSURES BAD SHORTCUTS", {
      fontFamily: "monospace",
      fontSize: "5px",
      color: PALETTE.terminalCyan
    }).setName("warning-simple-stakes").setOrigin(0.5, 0).setResolution(2);
    this.add.text(128, 162, "FRUS SOURCE TRAIL: HISTORY.STATE.GOV", {
      fontFamily: "monospace",
      fontSize: "4px",
      color: PALETTE.creamPaper
    }).setName("warning-history-state-shoutout").setOrigin(0.5, 0).setResolution(2);
    this.add.text(128, 172, "TAP / PRESS A TO CONTINUE", {
      fontFamily: "monospace",
      fontSize: "6px",
      color: PALETTE.goldStamp
    }).setName("warning-simple-prompt").setOrigin(0.5, 0).setResolution(2);
  }

  private async begin(fromGesture: boolean) {
    if (this.started) return;
    this.started = true;
    if (fromGesture) {
      await retroAudio.unlock();
      retroAudio.confirm();
    }
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      swallowNextInputFrame();
      this.scene.start("TitleScene");
    });
  }
}
