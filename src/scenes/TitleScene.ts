import Phaser from "phaser";
import { CONTROLS_TEXT, GAME_HEIGHT, GAME_WIDTH, PALETTE } from "../game/constants";
import { resetGameState, setSceneState } from "../game/state";
import { getSkipWarningPreference, setSkipWarningPreference } from "../game/warningSettings";
import { bindPointerPress, getInput, tickInput } from "../input/InputState";
import { retroAudio } from "../systems/audio";
import { transitionTo } from "../systems/sceneTransitions";
import { addSnesWorkflowRelicRack } from "../systems/snesPixelArt";

function color(hex: string) {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

export class TitleScene extends Phaser.Scene {
  private started = false;
  private skipWarning = false;
  private skipWarningText?: Phaser.GameObjects.Text;
  private ignoreNextPointerStart = false;

  constructor() {
    super("TitleScene");
  }

  create() {
    setSceneState("TitleScene", "title", "Press start to verify.");
    this.started = false;
    this.skipWarning = getSkipWarningPreference();
    this.ignoreNextPointerStart = false;
    retroAudio.startMusic("TitleScene");
    this.cameras.main.setBackgroundColor(PALETTE.deepRuby);
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, color(PALETTE.deepRuby));
    for (let y = 0; y < GAME_HEIGHT; y += 8) {
      for (let x = (y / 8) % 2 === 0 ? 0 : 8; x < GAME_WIDTH; x += 16) {
        this.add.rectangle(x, y, 2, 2, color(PALETTE.buckramHighlight));
      }
    }
    this.add.rectangle(128, 15, 256, 30, color(PALETTE.black));
    this.add.rectangle(128, 30, 256, 2, color(PALETTE.goldStamp));
    this.add.rectangle(28, 15, 42, 20, color(PALETTE.stoneGray)).setStrokeStyle(1, color(PALETTE.creamPaper));
    this.add.rectangle(20, 14, 6, 5, color(PALETTE.goldStamp));
    this.add.rectangle(29, 14, 5, 5, color(PALETTE.stoneLight));
    this.add.rectangle(38, 14, 5, 5, color(PALETTE.buckramHighlight));
    this.add.text(58, 7, "FRUS MAP", {
      fontFamily: "monospace",
      fontSize: "6px",
      color: PALETTE.goldStamp
    });
    this.add.text(184, 7, "-CONF-", {
      fontFamily: "monospace",
      fontSize: "7px",
      color: PALETTE.buckramHighlight
    });
    for (let i = 0; i < 5; i += 1) {
      this.add.rectangle(214 + i * 7, 21, 5, 5, color(PALETTE.buckramHighlight));
    }
    for (let x = 8; x <= 248; x += 16) {
      this.add.rectangle(x, 42, 16, 16, color(PALETTE.stoneDark));
      this.add.rectangle(x - 2, 40, 11, 11, color(PALETTE.stoneGray));
      this.add.rectangle(x, 218, 16, 16, color(PALETTE.stoneDark));
      this.add.rectangle(x - 2, 216, 11, 11, color(PALETTE.stoneGray));
    }
    this.drawWorldMapBriefing();

    this.add.text(128, 126, "RUBY RULE", {
      fontFamily: "monospace",
      fontSize: "22px",
      color: PALETTE.goldStamp
    }).setOrigin(0.5).setResolution(2);
    this.add.text(128, 151, "THE FRUS QUEST", {
      fontFamily: "monospace",
      fontSize: "10px",
      color: PALETTE.creamPaper
    }).setOrigin(0.5);
    addSnesWorkflowRelicRack(this, 128, 169);
    this.add.text(128, 197, "PRESS START TO VERIFY", {
      fontFamily: "monospace",
      fontSize: "8px",
      color: PALETTE.terminalCyan
    }).setOrigin(0.5);
    this.add.text(128, 213, CONTROLS_TEXT, {
      fontFamily: "monospace",
      fontSize: "6px",
      color: PALETTE.creamPaper,
      align: "center",
      lineSpacing: 2
    }).setOrigin(0.5);
    this.createSkipWarningToggle();

  }

  update() {
    tickInput();
    const input = getInput();
    if (input.soundJustPressed) this.toggleAudio();
    if (input.bJustPressed) this.toggleSkipWarning();
    if (this.ignoreNextPointerStart && input.pointerPrimaryJustPressed) {
      this.ignoreNextPointerStart = false;
      return;
    }
    if (input.aJustPressed || input.startJustPressed || input.pointerPrimaryJustPressed) this.start();
  }

  private drawWorldMapBriefing() {
    const centerX = 128;
    const centerY = 82;
    const frameWidth = 120;
    const frameHeight = 80;
    this.add.rectangle(centerX, centerY, frameWidth + 6, frameHeight + 6, color(PALETTE.sepiaInk))
      .setStrokeStyle(2, color(PALETTE.goldStamp));
    if (this.textures.exists("frus_world_map")) {
      const source = this.textures.get("frus_world_map").getSourceImage() as { width?: number; height?: number };
      const width = source.width ?? frameWidth;
      const height = source.height ?? frameHeight;
      const scale = Math.min(frameWidth / width, frameHeight / height);
      this.add.image(centerX, centerY, "frus_world_map").setOrigin(0.5).setScale(scale);
    } else {
      this.add.rectangle(centerX, centerY, frameWidth, frameHeight, color(PALETTE.mapWater));
    }
    this.add.rectangle(centerX, centerY - frameHeight / 2 - 1, frameWidth, 8, color(PALETTE.black), 0.6);
    this.add.text(centerX, centerY - frameHeight / 2 - 5, "FRUS PRODUCTION MAP", {
      fontFamily: "monospace",
      fontSize: "6px",
      color: PALETTE.goldStamp
    }).setOrigin(0.5);
  }

  private toggleAudio() {
    retroAudio.toggle();
  }

  private start() {
    if (this.started) return;
    this.started = true;
    retroAudio.confirm();
    resetGameState();
    transitionTo(this, "CharacterCreateScene");
  }

  private createSkipWarningToggle() {
    const hit = this.add.rectangle(191, 229, 112, 12, color(PALETTE.black), 0.01);
    bindPointerPress(hit, {
      down: () => {
        this.ignoreNextPointerStart = true;
        this.toggleSkipWarning();
      }
    });
    this.skipWarningText = this.add.text(191, 226, "", {
      fontFamily: "monospace",
      fontSize: "6px",
      color: PALETTE.goldStamp
    }).setOrigin(0.5, 0);
    this.renderSkipWarningToggle();
  }

  private toggleSkipWarning() {
    this.skipWarning = !this.skipWarning;
    setSkipWarningPreference(this.skipWarning);
    this.renderSkipWarningToggle();
  }

  private renderSkipWarningToggle() {
    const mark = this.skipWarning ? "X" : " ";
    this.skipWarningText?.setText(`B SKIP WARNING [${mark}]`);
  }
}
