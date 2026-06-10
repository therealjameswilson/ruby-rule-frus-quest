import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, PALETTE } from "../game/constants";
import { setLatestMessage, setSceneState, setVisibleEntities } from "../game/state";
import { isIntegerScale } from "../systems/pixelPerfect";

function color(hex: string) {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

export class RenderDebugScene extends Phaser.Scene {
  private metricsText!: Phaser.GameObjects.Text;

  constructor() {
    super("RenderDebugScene");
  }

  create() {
    setSceneState("RenderDebugScene", "debug", "Inspect pixel-art render scaling.");
    setVisibleEntities(["sample sprite 1x", "sample sprite 2x", "sample sprite 3x", "sample sprite 4x"]);
    this.cameras.main.setBackgroundColor(PALETTE.shadowNavy);
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, color(PALETTE.shadowNavy));
    this.add.rectangle(128, 18, 238, 24, color(PALETTE.deepRuby)).setStrokeStyle(2, color(PALETTE.goldStamp));
    this.add.text(128, 11, "PIXEL RENDER DEBUG", {
      fontFamily: "monospace",
      fontSize: "10px",
      color: PALETTE.goldStamp
    }).setOrigin(0.5);

    this.metricsText = this.add.text(14, 42, "", {
      fontFamily: "monospace",
      fontSize: "7px",
      color: PALETTE.creamPaper,
      lineSpacing: 3
    }).setDepth(5);

    this.add.rectangle(128, 165, 232, 82, color(PALETTE.black), 0.92).setStrokeStyle(2, color(PALETTE.terminalCyan)).setDepth(1);
    [1, 2, 3, 4].forEach((scale, index) => {
      const x = 34 + index * 62;
      this.add.image(x, 187, "sam").setScale(scale).setOrigin(0.5, 1).setDepth(2);
      this.add.text(x, 202, `${scale}X`, {
        fontFamily: "monospace",
        fontSize: "7px",
        color: PALETTE.goldStamp
      }).setOrigin(0.5).setDepth(2);
    });

    this.add.text(128, 225, "DIRECT URL: ?scene=RenderDebugScene", {
      fontFamily: "monospace",
      fontSize: "7px",
      color: PALETTE.terminalCyan
    }).setOrigin(0.5);

    this.updateMetrics();
    this.time.addEvent({ delay: 250, loop: true, callback: () => this.updateMetrics() });
  }

  private updateMetrics() {
    const canvas = this.game.canvas;
    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width / GAME_WIDTH;
    const scaleY = rect.height / GAME_HEIGHT;
    const sameScale = Math.abs(scaleX - scaleY) < 0.001;
    const integerScale = sameScale && isIntegerScale(scaleX);
    const displayScale = sameScale ? scaleX.toFixed(3) : `${scaleX.toFixed(3)} x ${scaleY.toFixed(3)}`;
    this.metricsText.setText([
      `CANVAS CSS SIZE: ${Math.round(rect.width)} x ${Math.round(rect.height)}`,
      `CANVAS BUFFER:   ${canvas.width} x ${canvas.height}`,
      `INTERNAL RES:    ${GAME_WIDTH} x ${GAME_HEIGHT}`,
      `DISPLAY SCALE:   ${displayScale}`,
      `INTEGER SCALE:   ${integerScale ? "YES" : "NO"}`,
      "RENDER FLAGS:    pixelArt true / antialias false",
      "SPRITES BELOW:   SAME ASSET AT 1X 2X 3X 4X"
    ]);
    setLatestMessage(`Render scale ${displayScale}; integer ${integerScale ? "yes" : "no"}`);
  }
}
