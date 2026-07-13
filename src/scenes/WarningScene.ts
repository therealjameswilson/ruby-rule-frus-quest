import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, PALETTE } from "../game/constants";
import { DANNE_WARNING_SCREEN_ASSET } from "../game/danneAtlas";
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
    setLatestMessage("Recover the FRUS volumes. DANN-E is a fictional rogue AI.");
    setVisibleEntities([
      DANNE_WARNING_SCREEN_ASSET.key,
      "three recovered FRUS volumes",
      "DANN-E",
      "history.state.gov shoutout",
      "TAP / Z / ENTER"
    ]);
    if (getSkipWarningPreference()) {
      this.scene.start("TitleScene");
      return;
    }

    this.cameras.main.setBackgroundColor(PALETTE.black);
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, color(PALETTE.black));
    this.drawQuestWarning();
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

  private drawQuestWarning() {
    if (!this.textures.exists(DANNE_WARNING_SCREEN_ASSET.key)) {
      this.drawSimpleWarningCard();
      return;
    }

    this.add.image(128, 120, DANNE_WARNING_SCREEN_ASSET.key)
      .setName("warning-frus-quest-art")
      .setOrigin(0.5)
      .setDepth(0);

    this.add.rectangle(128, 32, 238, 1, color(PALETTE.goldStamp), 0.92)
      .setName("warning-quest-title-rule")
      .setDepth(2);
    this.add.text(128, 7, "THE RECORD IS UNDER ATTACK", {
      fontFamily: "monospace",
      fontSize: "8px",
      color: PALETTE.goldStamp,
      fontStyle: "bold"
    }).setName("warning-quest-title").setOrigin(0.5, 0).setResolution(2).setDepth(2);
    this.add.text(128, 22, "RECOVER THE FRUS VOLUMES", {
      fontFamily: "monospace",
      fontSize: "8px",
      color: PALETTE.creamPaper
    }).setName("warning-quest-subtitle").setOrigin(0.5, 0).setResolution(2).setDepth(2);

    this.add.rectangle(128, 223, 256, 34, color(PALETTE.black), 0.9)
      .setName("warning-quest-prompt-band")
      .setDepth(1);
    this.add.rectangle(128, 206, 238, 1, color(PALETTE.goldStamp), 0.92)
      .setName("warning-quest-prompt-rule")
      .setDepth(2);
    this.add.text(128, 210, "DANN-E ERASES THE RECORD.", {
      fontFamily: "monospace",
      fontSize: "8px",
      color: PALETTE.terminalCyan
    }).setName("warning-quest-stakes").setOrigin(0.5, 0).setResolution(2).setDepth(2);
    this.add.text(128, 220, "EXPLORE HISTORY.STATE.GOV", {
      fontFamily: "monospace",
      fontSize: "8px",
      color: PALETTE.creamPaper
    }).setName("warning-history-state-shoutout").setOrigin(0.5, 0).setResolution(2).setDepth(2);
    const prompt = this.add.text(128, 229, "TAP / Z / ENTER", {
      fontFamily: "monospace",
      fontSize: "8px",
      color: PALETTE.goldStamp,
      fontStyle: "bold"
    }).setName("warning-quest-prompt").setOrigin(0.5, 0).setResolution(2).setDepth(2);

    this.tweens.add({
      targets: prompt,
      alpha: 0.4,
      duration: 500,
      yoyo: true,
      repeat: -1
    });

    this.addQuestSpark(128, 101, 0);
    this.addQuestSpark(83, 142, 180);
    this.addQuestSpark(173, 142, 360);
  }

  private addQuestSpark(x: number, y: number, delay: number) {
    const horizontal = this.add.rectangle(x, y, 3, 1, color(PALETTE.goldStamp), 0.9).setDepth(2);
    const vertical = this.add.rectangle(x, y, 1, 3, color(PALETTE.creamPaper), 0.9).setDepth(2);
    this.tweens.add({
      targets: [horizontal, vertical],
      alpha: 0.2,
      duration: 420,
      delay,
      yoyo: true,
      repeat: -1
    });
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
    this.add.text(128, 172, "TAP / Z / ENTER", {
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
