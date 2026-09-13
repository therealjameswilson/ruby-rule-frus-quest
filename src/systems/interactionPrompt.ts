import Phaser from "phaser";
import { PALETTE } from "../game/constants";
import type { Interactable } from "../game/types";
import {
  computePromptPlacement,
  fitPromptText,
  promptVerbForKind,
  type PromptPlacementBounds
} from "./interactionPromptPlacement";
import { snapPixel } from "./pixelPerfect";
import { getPrimaryActionBadge } from "../input/InputState";

export { computePromptPlacement, promptVerbForKind } from "./interactionPromptPlacement";
export type { PromptPlacement, PromptPlacementBounds } from "./interactionPromptPlacement";

function color(hex: string) {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

// Keep the action readable above the target and leave its artwork uncovered.
export class InteractionPrompt {
  private readonly container: Phaser.GameObjects.Container;
  private readonly panel: Phaser.GameObjects.Rectangle;
  private readonly border: Phaser.GameObjects.Rectangle;
  private readonly caret: Phaser.GameObjects.Triangle;
  private readonly badge: Phaser.GameObjects.Rectangle;
  private readonly badgeText: Phaser.GameObjects.Text;
  private readonly labelText: Phaser.GameObjects.Text;
  private readonly ring: Phaser.GameObjects.Graphics;
  private currentText: string | null = null;

  constructor(scene: Phaser.Scene, depth = 950, highlightDepth = depth - 3) {
    this.ring = scene.add.graphics().setName("interaction-target-brackets")
      .setDepth(highlightDepth).setVisible(false);
    this.ring.fillStyle(color(PALETTE.goldStamp), 1);
    // Four open corners, on whole pixels; no fill or pulsing scale over art.
    for (const x of [-10, 6]) {
      for (const y of [-10, 9]) this.ring.fillRect(x, y, 4, 1);
    }
    for (const x of [-10, 9]) {
      for (const y of [-10, 6]) this.ring.fillRect(x, y, 1, 4);
    }
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
      .text(0, 0, getPrimaryActionBadge(), { fontFamily: "monospace", fontSize: "8px", color: PALETTE.black })
      .setOrigin(0.5);
    this.labelText = scene.add
      .text(0, 0, "", { fontFamily: "monospace", fontSize: "8px", color: PALETTE.creamPaper })
      .setName("interaction-prompt-label")
      .setOrigin(0, 0.5);
    this.container = scene.add
      .container(0, 0, [this.panel, this.border, this.caret, this.badge, this.badgeText, this.labelText])
      .setName("interaction-prompt")
      .setDepth(depth)
      .setVisible(false);
  }

  get visible() {
    return this.container.visible;
  }

  update(
    _deltaMs: number,
    nearest: Interactable | null,
    bounds?: PromptPlacementBounds,
    display?: { badge?: string; text?: string }
  ) {
    const placement = computePromptPlacement(nearest, bounds);
    if (!placement.visible || !nearest) {
      this.container.setVisible(false);
      this.ring.setVisible(false);
      return;
    }

    const text = display?.text ?? `${placement.verb} ${placement.label}`;
    if (text !== this.currentText) {
      this.currentText = text;
      const fitted = fitPromptText(text, (candidate) => {
        this.labelText.setText(candidate);
        return this.labelText.width;
      });
      this.labelText.setText(fitted);
    }
    const labelWidth = this.labelText.width;
    const panelWidth = Math.max(34, labelWidth + 18);
    this.panel.setSize(panelWidth, 13);
    this.border.setSize(panelWidth + 2, 15);
    const left = -panelWidth / 2;
    const requestedBadge = display?.badge;
    this.badgeText.setText(!requestedBadge || requestedBadge === "A" ? getPrimaryActionBadge() : requestedBadge);
    this.badge.setPosition(left + 8, 0);
    this.badgeText.setPosition(left + 8, 0);
    this.labelText.setPosition(left + 14, 0);
    const fittedPlacement = computePromptPlacement(nearest, bounds, panelWidth + 2);
    // Keep the panel inside the canvas while its caret still points toward the target.
    const caretX = Math.max(left + 6, Math.min(-left - 6, placement.ringX - fittedPlacement.x));
    this.caret.setPosition(snapPixel(caretX), 8);

    this.container.setPosition(snapPixel(fittedPlacement.x), snapPixel(fittedPlacement.y)).setVisible(true);
    const ringX = snapPixel(placement.ringX);
    const ringY = snapPixel(placement.ringY);
    this.ring.setPosition(ringX, ringY).setVisible(true);
  }

  destroy() {
    this.container.destroy();
    this.ring.destroy();
  }
}
