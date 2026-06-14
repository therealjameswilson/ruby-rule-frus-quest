import Phaser from "phaser";
import { characterAnimKey } from "../art/character_anims";
import { CHARACTER_KEYS } from "../art/characters";
import { GAME_HEIGHT, GAME_WIDTH, PALETTE } from "../game/constants";
import {
  SNES_ANTAGONIST_ASSETS,
  SNES_BUREAUCRATIC_WALL_ASSETS
} from "../game/snesAtlas";
import { setLatestMessage, setSceneState, setVisibleEntities } from "../game/state";
import { isIntegerScale } from "../systems/pixelPerfect";

function color(hex: string) {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

export class RenderDebugScene extends Phaser.Scene {
  private metricsText!: Phaser.GameObjects.Text;
  private readonly proofTextureKey = "pixel-proof-single-texel";

  constructor() {
    super("RenderDebugScene");
  }

  create() {
    setSceneState("RenderDebugScene", "debug", "Inspect pixel-art render scaling.");
    setVisibleEntities([
      "sample sprite 1x",
      "sample sprite 2x",
      "sample sprite 3x",
      "sample sprite 4x",
      ...CHARACTER_KEYS.map((key) => `${key} 32x48 art-pack sheet`),
      ...SNES_ANTAGONIST_ASSETS.map((asset) => `${asset.displayName} antagonist sprite`),
      ...SNES_BUREAUCRATIC_WALL_ASSETS.map((wall) => `${wall.type} wall sprite`)
    ]);
    this.cameras.main.setBackgroundColor(PALETTE.shadowNavy);
    this.cameras.main.roundPixels = true;
    this.markPixelProofVisible(true);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.markPixelProofVisible(false));
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, color(PALETTE.shadowNavy));
    this.createPixelProofMarks();
    this.add.rectangle(128, 18, 238, 24, color(PALETTE.deepRuby)).setStrokeStyle(2, color(PALETTE.goldStamp));
    this.add.text(128, 11, "PIXEL RENDER DEBUG", {
      fontFamily: "monospace",
      fontSize: "10px",
      color: PALETTE.goldStamp
    }).setOrigin(0.5);

    this.add.rectangle(11, 34, 154, 58, color(PALETTE.black), 0.9).setOrigin(0, 0).setStrokeStyle(1, color(PALETTE.terminalCyan)).setDepth(4);
    this.metricsText = this.add.text(14, 37, "", {
      fontFamily: "monospace",
      fontSize: "4px",
      color: PALETTE.creamPaper,
      lineSpacing: 0
    }).setDepth(5);

    this.add.rectangle(128, 119, 236, 48, color(PALETTE.black)).setStrokeStyle(2, color(PALETTE.goldStamp)).setDepth(1);
    SNES_BUREAUCRATIC_WALL_ASSETS.forEach((wall, index) => {
      const x = 25 + index * 34;
      this.add.image(x, 115, wall.key).setDepth(2);
      this.add.text(x, 133, wall.type.replace("DANN-E QUEUE", "DANN-E").slice(0, 7), {
        fontFamily: "monospace",
        fontSize: "5px",
        color: PALETTE.creamPaper
      }).setOrigin(0.5).setDepth(2);
    });
    this.add.text(128, 91, "BUREAUCRATIC WALL SPRITES", {
      fontFamily: "monospace",
      fontSize: "7px",
      color: PALETTE.goldStamp
    }).setOrigin(0.5).setDepth(2);

    CHARACTER_KEYS.slice(0, 5).forEach((key, index) => {
      const x = 28 + index * 26;
      this.add.sprite(x, 84, key).setOrigin(0.5, 0.9).setScale(1).play(characterAnimKey(key, index % 2 === 0 ? "idle-down" : "reading")).setDepth(2);
      this.add.text(x, 98, key.split("_")[0].slice(0, 4).toUpperCase(), {
        fontFamily: "monospace",
        fontSize: "5px",
        color: PALETTE.goldStamp,
        backgroundColor: PALETTE.black
      }).setOrigin(0.5).setDepth(2);
    });

    SNES_ANTAGONIST_ASSETS.forEach((asset, index) => {
      if (!this.textures.exists(asset.key)) return;
      const x = 177 + index * 21;
      const label = asset.displayName
        .replace("Federal Government Shutdown", "SHUT")
        .replace("Navy Hill Mice", "MICE")
        .replace("HAC Member", "HAC")
        .replace("Bees", "BEES")
        .slice(0, 5);
      this.add.image(x, 64, asset.key).setDepth(2);
      this.add.text(x, 80, label, {
        fontFamily: "monospace",
        fontSize: "5px",
        color: PALETTE.goldStamp,
        backgroundColor: PALETTE.black
      }).setOrigin(0.5).setDepth(2);
    });

    CHARACTER_KEYS.slice(5).forEach((key, index) => {
      const x = 30 + index * 30;
      this.add.sprite(x, 165, key).setOrigin(0.5, 0.9).setScale(1).play(characterAnimKey(key, index % 2 === 0 ? "walk-down" : "approval")).setDepth(2);
      this.add.text(x, 181, key.split("_")[0].slice(0, 4).toUpperCase(), {
        fontFamily: "monospace",
        fontSize: "5px",
        color: PALETTE.goldStamp,
        backgroundColor: PALETTE.black
      }).setOrigin(0.5).setDepth(2);
    });

    this.add.rectangle(128, 191, 232, 64, color(PALETTE.black)).setStrokeStyle(2, color(PALETTE.terminalCyan)).setDepth(1);
    [1, 2, 3, 4].forEach((scale, index) => {
      const x = 34 + index * 62;
      this.add.sprite(x, 225, "compiler").setScale(scale).setOrigin(0.5, 1).play(characterAnimKey("compiler", "idle-down")).setDepth(2);
      this.add.text(x, 226, `${scale}X`, {
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
    const metrics = window.rubyRuleMobileMetrics;
    const scaleX = rect.width / GAME_WIDTH;
    const scaleY = rect.height / GAME_HEIGHT;
    const rawDpr = window.devicePixelRatio || 1;
    const roundedDpr = metrics?.dpr ?? Math.max(1, Math.round(rawDpr));
    const integerZoomTarget = metrics?.integerZoomTarget ?? Math.max(1, Math.round(scaleX));
    const backingPerGamePixelX = canvas.width / GAME_WIDTH;
    const backingPerGamePixelY = canvas.height / GAME_HEIGHT;
    const expectedDevicePixels = integerZoomTarget * roundedDpr;
    const sameScale = Math.abs(scaleX - scaleY) < 0.001;
    const integerScale = sameScale && isIntegerScale(scaleX);
    const exactDeviceMapping = (
      integerScale
      && Math.abs(backingPerGamePixelX - expectedDevicePixels) < 0.001
      && Math.abs(backingPerGamePixelY - expectedDevicePixels) < 0.001
    );
    const displayScale = sameScale ? scaleX.toFixed(3) : `${scaleX.toFixed(3)} x ${scaleY.toFixed(3)}`;
    this.metricsText.setText([
      "ORIGIN: 16x16 CHECKER + RED 1PX @0,0",
      `DPR: ${rawDpr.toFixed(3)} RAW / ${roundedDpr} ROUND`,
      `CSS: ${Math.round(rect.width)}x${Math.round(rect.height)}  BUF: ${canvas.width}x${canvas.height}`,
      `INTERNAL: ${GAME_WIDTH}x${GAME_HEIGHT}`,
      `ZOOM: ${integerZoomTarget} TARGET / ${displayScale} COMPUTED`,
      `1PX: ${expectedDevicePixels} DEVICE PX EXPECTED`,
      `BACKING: ${backingPerGamePixelX.toFixed(3)}x${backingPerGamePixelY.toFixed(3)}`,
      `CHECK: ${exactDeviceMapping ? "PASS" : "CHECK"}  FLAGS: PIXEL/NEAREST`
    ]);
    setLatestMessage(`Pixel proof ${exactDeviceMapping ? "pass" : "check"}; 1px=${expectedDevicePixels} device px`);
  }

  private createPixelProofMarks() {
    const checker = this.add.graphics().setDepth(2000).setScrollFactor(0);
    for (let y = 0; y < 16; y += 1) {
      for (let x = 0; x < 16; x += 1) {
        checker.fillStyle(color((x + y) % 2 === 0 ? PALETTE.creamPaper : PALETTE.black), 1);
        checker.fillRect(x, y, 1, 1);
      }
    }
    checker.lineStyle(1, color(PALETTE.terminalCyan), 1).strokeRect(0, 0, 16, 16);

    if (!this.textures.exists(this.proofTextureKey)) {
      const texture = this.textures.createCanvas(this.proofTextureKey, 1, 1);
      const context = texture?.getContext();
      if (texture && context) {
        context.imageSmoothingEnabled = false;
        context.fillStyle = PALETTE.buckramHighlight;
        context.fillRect(0, 0, 1, 1);
        texture.refresh();
        texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      }
    }

    this.add.image(0, 0, this.proofTextureKey).setOrigin(0, 0).setDepth(2001).setScrollFactor(0);
  }

  private markPixelProofVisible(visible: boolean) {
    const metrics = window.rubyRuleMobileMetrics;
    if (!metrics) return;
    const overlay = document.getElementById("pixel-proof-overlay") as HTMLCanvasElement | null;
    metrics.pixelProofVisible = visible || Boolean(overlay && !overlay.hidden);
  }
}
