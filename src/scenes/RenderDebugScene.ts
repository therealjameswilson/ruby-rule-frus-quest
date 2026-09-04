import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, PALETTE } from "../game/constants";
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
    setSceneState("RenderDebugScene", "debug", "Inspect native glyphs and pixel scaling.");
    setVisibleEntities(["16x16 checkerboard", "origin single texel", "native 6px and 8px text", "1x-4x texels"]);
    this.cameras.main.setBackgroundColor(PALETTE.black);
    this.cameras.main.roundPixels = true;
    this.markPixelProofVisible(true);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.markPixelProofVisible(false));
    this.createPixelProofMarks();
    const label = (x: number, y: number, text: string, size = 8, tint: string = PALETTE.creamPaper) => this.add.text(x, y, text, {
      fontSize: `${size}px`, color: tint, lineSpacing: 2
    });
    label(24, 6, "PIXEL + TEXT PROOF", 8, PALETTE.goldStamp);
    this.metricsText = label(12, 30, "", 6);
    this.add.rectangle(128, 90, 232, 1, color(PALETTE.stoneDark));
    label(12, 98, "READ / EDIT / PUBLISH");
    label(12, 114, "SMALL: ABCDEFGHIJKLMNOPQRSTUVWXYZ", 6);
    label(12, 126, "0123456789 [A] CONTINUE [B] BACK", 6);
    label(12, 142, "B E F H M N S  12/30");
    this.add.rectangle(128, 157, 232, 1, color(PALETTE.stoneDark));
    [1, 2, 3, 4].forEach((scale, index) => {
      const x = 24 + index * 50;
      this.add.image(x, 174, this.proofTextureKey).setOrigin(0).setScale(scale);
      label(x - 2, 190, `${scale}X`, 6, PALETTE.goldStamp);
    });
    const diagonal = this.add.graphics();
    diagonal.fillStyle(color(PALETTE.terminalCyan));
    for (let index = 0; index < 16; index += 1) diagonal.fillRect(222 + index, 170 + index, 1, 1);
    label(12, 212, "SPRITES: ?scene=SpriteGallery", 6, PALETTE.terminalCyan);
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
    const physicalX = scaleX * roundedDpr;
    const physicalY = scaleY * roundedDpr;
    // The scale controller reports its target in device pixels per game pixel.
    const target = metrics?.integerZoomTarget ?? Math.max(1, Math.round(physicalX));
    const exact = isIntegerScale(physicalX) && isIntegerScale(physicalY)
      && Math.abs(physicalX - target) < 0.001 && Math.abs(physicalY - target) < 0.001;
    this.metricsText.setText([
      `INTERNAL: ${GAME_WIDTH}x${GAME_HEIGHT}   DPR: ${rawDpr.toFixed(2)}`,
      `CSS: ${Math.round(rect.width)}x${Math.round(rect.height)}`,
      `BACKING: ${canvas.width}x${canvas.height}`,
      `CSS ZOOM: ${scaleX.toFixed(3)}x${scaleY.toFixed(3)}`,
      `1PX: ${physicalX.toFixed(2)} DEVICE / ${target} TARGET`,
      `CHECK: ${exact ? "PASS" : "CHECK"}   NEAREST / NATIVE TEXT`
    ]);
    setLatestMessage(`Pixel proof ${exact ? "pass" : "check"}; 1px=${target} device px`);
  }

  private createPixelProofMarks() {
    const checker = this.add.graphics().setDepth(2000).setScrollFactor(0);
    for (let y = 0; y < 16; y += 1) {
      for (let x = 0; x < 16; x += 1) {
        checker.fillStyle(color((x + y) % 2 === 0 ? PALETTE.creamPaper : PALETTE.black), 1);
        checker.fillRect(x, y, 1, 1);
      }
    }
    if (!this.textures.exists(this.proofTextureKey)) {
      const texture = this.textures.createCanvas(this.proofTextureKey, 1, 1);
      if (texture) {
        const context = texture.getContext();
        context.imageSmoothingEnabled = false;
        context.fillStyle = PALETTE.buckramHighlight;
        context.fillRect(0, 0, 1, 1);
        texture.refresh();
        texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      }
    }
    this.add.image(0, 0, this.proofTextureKey).setOrigin(0).setDepth(2001).setScrollFactor(0);
  }

  private markPixelProofVisible(visible: boolean) {
    const metrics = window.rubyRuleMobileMetrics;
    if (!metrics) return;
    const overlay = document.getElementById("pixel-proof-overlay") as HTMLCanvasElement | null;
    metrics.pixelProofVisible = visible || Boolean(overlay && !overlay.hidden);
  }
}
