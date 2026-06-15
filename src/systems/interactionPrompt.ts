import Phaser from "phaser";
import { PALETTE } from "../game/constants";
import type { Interactable } from "../game/types";
import {
  computePromptPlacement,
  promptVerbForKind,
  type PromptPlacementBounds
} from "./interactionPromptPlacement";
import { snapPixel } from "./pixelPerfect";

export { computePromptPlacement, promptVerbForKind } from "./interactionPromptPlacement";
export type { PromptPlacement, PromptPlacementBounds } from "./interactionPromptPlacement";

function color(hex: string) {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

// SNES-style floating interaction prompt: a small framed "A VERB LABEL" panel
// that hovers above the nearest interactable plus an animated highlight ring on
// the target itself. Replaces the bare bottom-of-screen hint text with a cue the
// player can read in context, without obscuring gameplay.
export class InteractionPrompt {
  private readonly container: Phaser.GameObjects.Container;
  private readonly panel: Phaser.GameObjects.Rectangle;
  private readonly border: Phaser.GameObjects.Rectangle;
  private readonly caret: Phaser.GameObjects.Triangle;
  private readonly badge: Phaser.GameObjects.Rectangle;
  private readonly badgeText: Phaser.GameObjects.Text;
  private readonly labelText: Phaser.GameObjects.Text;
  private readonly ring: Phaser.GameObjects.Rectangle;
  private readonly ringInner: Phaser.GameObjects.Rectangle;
  private readonly ringGlow: Phaser.GameObjects.Rectangle;
  private currentId: string | null = null;
  private clock = 0;

  constructor(scene: Phaser.Scene, depth = 950) {
    // A soft filled square behind the outlines reads as a highlight "glow" on
    // the target so the interactable visibly lights up, not just a hairline box.
    this.ringGlow = scene.add
      .rectangle(0, 0, 22, 22, color(PALETTE.goldStamp), 0.18)
      .setDepth(depth - 3)
      .setVisible(false);
    this.ring = scene.add
      .rectangle(0, 0, 24, 24)
      .setStrokeStyle(2, color(PALETTE.goldStamp), 1)
      .setDepth(depth - 2)
      .setVisible(false);
    this.ringInner = scene.add
      .rectangle(0, 0, 16, 16)
      .setStrokeStyle(1, color(PALETTE.creamPaper), 0.6)
      .setDepth(depth - 2)
      .setVisible(false);
    this.panel = scene.add.rectangle(0, 0, 60, 13, color(PALETTE.shadowNavy), 0.96).setOrigin(0.5);
    this.border = scene.add
      .rectangle(0, 0, 62, 15)
      .setStrokeStyle(1, color(PALETTE.goldStamp))
      .setOrigin(0.5);
    // Downward caret so the floating panel visibly points at the target below it.
    this.caret = scene.add
      .triangle(0, 9, -3, 0, 3, 0, 0, 4, color(PALETTE.goldStamp))
      .setOrigin(0.5, 0);
    this.badge = scene.add.rectangle(0, 0, 9, 9, color(PALETTE.goldStamp)).setOrigin(0.5);
    this.badgeText = scene.add
      .text(0, 0, "A", { fontFamily: "monospace", fontSize: "7px", color: PALETTE.black })
      .setOrigin(0.5);
    this.labelText = scene.add
      .text(0, 0, "", { fontFamily: "monospace", fontSize: "6px", color: PALETTE.creamPaper })
      .setOrigin(0, 0.5);
    this.container = scene.add
      .container(0, 0, [this.panel, this.border, this.caret, this.badge, this.badgeText, this.labelText])
      .setDepth(depth)
      .setVisible(false);
  }

  get visible() {
    return this.container.visible;
  }

  update(deltaMs: number, nearest: Interactable | null, bounds?: PromptPlacementBounds) {
    this.clock += deltaMs;
    const placement = computePromptPlacement(nearest, bounds);
    if (!placement.visible || !nearest) {
      this.container.setVisible(false);
      this.ring.setVisible(false);
      this.ringInner.setVisible(false);
      this.ringGlow.setVisible(false);
      this.currentId = null;
      return;
    }

    // A gentle 1px bob keeps the prompt lively without anti-aliasing or motion
    // blur; the step keeps every frame pixel-snapped.
    const bob = Math.floor(this.clock / 220) % 2 === 0 ? 0 : 1;
    const text = `${placement.verb} ${placement.label}`;
    this.labelText.setText(text);
    const labelWidth = this.labelText.width;
    const panelWidth = Math.max(34, labelWidth + 18);
    this.panel.setSize(panelWidth, 13);
    this.border.setSize(panelWidth + 2, 15);
    const left = -panelWidth / 2;
    this.badge.setPosition(left + 8, 0);
    this.badgeText.setPosition(left + 8, 0);
    this.labelText.setPosition(left + 14, 0);
    // Caret sits centered under the panel, pointing down at the target.
    this.caret.setPosition(0, 8);

    this.container.setPosition(snapPixel(placement.x), snapPixel(placement.y - bob)).setVisible(true);

    // Highlight ring on the target. A faster pulse on first acquisition reads as
    // "this just became interactable" feedback.
    const justAcquired = nearest.id !== this.currentId;
    this.currentId = nearest.id;
    const pulse = Math.floor(this.clock / (justAcquired ? 90 : 180)) % 2 === 0;
    const ringX = snapPixel(placement.ringX);
    const ringY = snapPixel(placement.ringY);
    this.ring.setPosition(ringX, ringY).setVisible(true).setScale(pulse ? 1 : 0.86);
    this.ringInner.setPosition(ringX, ringY).setVisible(true).setScale(pulse ? 0.86 : 1);
    this.ringGlow
      .setPosition(ringX, ringY)
      .setVisible(true)
      .setAlpha(pulse ? 0.24 : 0.12)
      .setScale(pulse ? 1 : 0.9);
  }

  destroy() {
    this.container.destroy();
    this.ring.destroy();
    this.ringInner.destroy();
    this.ringGlow.destroy();
  }
}
