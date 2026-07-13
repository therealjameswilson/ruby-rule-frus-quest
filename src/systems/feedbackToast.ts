import Phaser from "phaser";
import { PALETTE } from "../game/constants";
import {
  computeToastPlacement,
  isToastExpired,
  toastAlpha,
  type ToastAnchorBounds,
  type ToastPlacement
} from "./feedbackToastPlacement";
import { snapPixel } from "./pixelPerfect";

export {
  computeToastPlacement,
  isToastExpired,
  toastAlpha,
  FEEDBACK_TOAST_HOLD_MS,
  FEEDBACK_TOAST_FADE_MS,
  FEEDBACK_TOAST_TOTAL_MS
} from "./feedbackToastPlacement";

function color(hex: string) {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

type ToastTone = "warn" | "info";

// A short, high-contrast 16-bit message panel that floats above the player and
// holds long enough to read. Used for transient feedback the bottom HUD hint
// swallowed before, most importantly the "nothing to interact with" cue when the
// player presses the primary action away from any target (live audit, 2026-06-15).
export class FeedbackToast {
  private readonly container: Phaser.GameObjects.Container;
  private readonly panel: Phaser.GameObjects.Rectangle;
  private readonly border: Phaser.GameObjects.Rectangle;
  private readonly text: Phaser.GameObjects.Text;
  private elapsed = 0;
  private active = false;

  constructor(scene: Phaser.Scene, depth = 1200) {
    this.panel = scene.add.rectangle(0, 0, 80, 16, color(PALETTE.shadowNavy), 0.96).setOrigin(0.5);
    this.border = scene.add.rectangle(0, 0, 82, 18).setStrokeStyle(1, color(PALETTE.goldStamp)).setOrigin(0.5);
    this.text = scene.add
      .text(0, 0, "", {
        fontFamily: "monospace",
        fontSize: "8px",
        color: PALETTE.creamPaper,
        align: "center"
      })
      .setOrigin(0.5);
    this.container = scene.add
      .container(0, 0, [this.panel, this.border, this.text])
      .setDepth(depth)
      .setVisible(false);
  }

  get visible() {
    return this.container.visible;
  }

  show(message: string, anchor: ToastPlacement, tone: ToastTone = "warn", bounds?: ToastAnchorBounds) {
    this.elapsed = 0;
    this.active = true;
    const upper = message.toUpperCase();
    this.text.setText(upper);
    const width = Math.max(48, this.text.width + 14);
    this.panel.setSize(width, 16);
    this.border.setSize(width + 2, 18);
    const accent = tone === "warn" ? PALETTE.classNetRed : PALETTE.terminalCyan;
    this.border.setStrokeStyle(1, color(accent));
    this.text.setColor(tone === "warn" ? PALETTE.creamPaper : PALETTE.terminalCyan);
    this.place(anchor, bounds);
    this.container.setAlpha(1).setVisible(true);
  }

  private place(anchor: ToastPlacement, bounds?: ToastAnchorBounds) {
    const placement = computeToastPlacement(anchor, bounds, 26, this.border.displayWidth / 2);
    this.container.setPosition(snapPixel(placement.x), snapPixel(placement.y));
  }

  update(deltaMs: number, anchor?: ToastPlacement, bounds?: ToastAnchorBounds) {
    if (!this.active) return;
    this.elapsed += deltaMs;
    // Keep tracking the player while held so the toast trails the avatar.
    if (anchor) this.place(anchor, bounds);
    if (isToastExpired(this.elapsed)) {
      this.active = false;
      this.container.setVisible(false);
      return;
    }
    this.container.setAlpha(toastAlpha(this.elapsed));
  }

  destroy() {
    this.container.destroy();
  }
}
