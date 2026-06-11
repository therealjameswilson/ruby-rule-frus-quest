import Phaser from "phaser";
import { PALETTE } from "../game/constants";
import type { Position } from "../game/types";
import { setPixelPosition, snapPixel } from "../systems/pixelPerfect";

function color(hex: string) {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

export type BureaucraticWallBehavior = "slow-chase" | "wander" | "horizontal-patrol" | "block" | "freeze" | "splitter" | "push";

interface BureaucraticWallOptions {
  behavior?: BureaucraticWallBehavior;
  accent?: string;
}

export class BureaucraticWall {
  readonly id: string;
  readonly label: string;
  readonly x: number;
  readonly y: number;
  private readonly container: Phaser.GameObjects.Container;
  private readonly stone: Phaser.GameObjects.Image;
  private readonly crack: Phaser.GameObjects.Rectangle;
  private cleared = false;
  private wobbleOffset: number;
  private currentX: number;
  private currentY: number;
  private alertUntil = 0;
  private readonly behavior: BureaucraticWallBehavior;
  private readonly accent: string;
  private wanderTarget: Position;
  private retargetAt = 0;

  constructor(scene: Phaser.Scene, id: string, label: string, x: number, y: number, options: BureaucraticWallOptions = {}) {
    this.id = id;
    this.label = label;
    this.x = x;
    this.y = y;
    this.currentX = x;
    this.currentY = y;
    this.wobbleOffset = Phaser.Math.Between(0, 360);
    this.behavior = options.behavior ?? "slow-chase";
    this.accent = options.accent ?? PALETTE.buckramHighlight;
    this.wanderTarget = { x, y };
    const shadow = scene.add.ellipse(0, 15, 36, 8, color(PALETTE.black), 0.38);
    this.stone = scene.add.image(0, 0, "bureaucratic-wall");
    const labelText = scene.add
      .text(0, 1, label.toUpperCase(), {
        fontFamily: "monospace",
        fontSize: "5px",
        color: PALETTE.creamPaper,
        align: "center",
        wordWrap: { width: 31, useAdvancedWrap: true }
      })
      .setOrigin(0.5);
    this.crack = scene.add.rectangle(9, -2, 1, 20, color(PALETTE.black), 0.45).setAngle(18).setVisible(false);
    const behaviorPip = scene.add.rectangle(-12, -14, 6, 4, color(this.accent)).setStrokeStyle(1, color(PALETTE.black));
    this.container = scene.add.container(x, y, [shadow, this.stone, labelText, behaviorPip, this.crack]).setDepth(y);
  }

  get isCleared() {
    return this.cleared;
  }

  get position(): Position {
    return { x: this.currentX, y: this.currentY };
  }

  update(timeMs: number, deltaMs = 16, target?: Position) {
    if (this.cleared) return;
    const homeRadius = this.behavior === "block" || this.behavior === "freeze" || this.behavior === "splitter" ? 1 : 7;
    const homeX = this.x + Math.sin((timeMs + this.wobbleOffset) / 720) * homeRadius;
    const homeY = this.y + Math.cos((timeMs + this.wobbleOffset) / 860) * Math.max(1, homeRadius - 3);
    let desiredX = homeX;
    let desiredY = homeY;

    if (this.behavior === "horizontal-patrol") {
      desiredX = this.x + Math.sin((timeMs + this.wobbleOffset) / 520) * 28;
      desiredY = this.y;
    } else if (this.behavior === "wander") {
      if (timeMs >= this.retargetAt) {
        this.retargetAt = timeMs + Phaser.Math.Between(900, 1600);
        this.wanderTarget = {
          x: Phaser.Math.Clamp(this.x + Phaser.Math.Between(-30, 30), 28, 228),
          y: Phaser.Math.Clamp(this.y + Phaser.Math.Between(-22, 22), 56, 202)
        };
      }
      desiredX = this.wanderTarget.x;
      desiredY = this.wanderTarget.y;
    } else if ((this.behavior === "slow-chase" || this.behavior === "push") && target) {
      const dx = target.x - this.currentX;
      const dy = target.y - this.currentY;
      const distance = Math.hypot(dx, dy);
      const sight = this.behavior === "push" ? 74 : 78;
      const pressure = this.behavior === "push" ? 16 : 11;
      if (distance < sight && distance > 1) {
        desiredX += (dx / distance) * pressure;
        desiredY += (dy / distance) * Math.max(8, pressure - 3);
      }
    }
    const maxDrift = this.behavior === "wander" || this.behavior === "horizontal-patrol" ? 34 : this.behavior === "block" || this.behavior === "freeze" || this.behavior === "splitter" ? 3 : 18;
    desiredX = Phaser.Math.Clamp(desiredX, this.x - maxDrift, this.x + maxDrift);
    desiredY = Phaser.Math.Clamp(desiredY, this.y - maxDrift, this.y + maxDrift);
    const baseSpeed = this.behavior === "slow-chase" ? 10 : this.behavior === "wander" ? 16 : this.behavior === "horizontal-patrol" ? 20 : this.behavior === "push" ? 18 : 7;
    const speed = (timeMs < this.alertUntil ? 32 : baseSpeed) * (deltaMs / 1000);
    this.currentX = Phaser.Math.Linear(this.currentX, desiredX, Phaser.Math.Clamp(speed, 0.02, 0.22));
    this.currentY = Phaser.Math.Linear(this.currentY, desiredY, Phaser.Math.Clamp(speed, 0.02, 0.22));
    const bob = Math.sin((timeMs + this.wobbleOffset) / (this.behavior === "freeze" ? 90 : 180)) * (this.behavior === "freeze" ? 0.7 : 1.3);
    const renderX = snapPixel(this.currentX);
    const renderY = snapPixel(this.currentY + bob);
    setPixelPosition(this.container, renderX, renderY);
    this.container.setDepth(renderY);
    this.stone.setTint(timeMs < this.alertUntil ? color(this.accent) : 0xffffff);
  }

  markHit() {
    this.alertUntil = this.container.scene.time.now + 700;
    this.crack.setVisible(true);
    this.container.scene.tweens.add({
      targets: this.container,
      x: this.x + 2,
      duration: 45,
      yoyo: true,
      repeat: 3,
      ease: "Stepped"
    });
  }

  clear() {
    if (this.cleared) return;
    this.cleared = true;
    this.crack.setVisible(true);
    this.container.scene.tweens.add({
      targets: this.container,
      alpha: 0,
      duration: 260,
      ease: "Stepped",
      onComplete: () => this.container.destroy()
    });
  }

  destroy() {
    this.container.destroy();
  }

  isTouching(position: Position, radius = 20) {
    if (this.cleared) return false;
    return Phaser.Math.Distance.Between(this.currentX, this.currentY, position.x, position.y) <= radius;
  }
}
