import Phaser from "phaser";
import { PALETTE } from "../game/constants";
import type { Position } from "../game/types";
import { setPixelPosition, snapPixel } from "../systems/pixelPerfect";

function color(hex: string) {
  return Phaser.Display.Color.HexStringToColor(hex).color;
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

  constructor(scene: Phaser.Scene, id: string, label: string, x: number, y: number) {
    this.id = id;
    this.label = label;
    this.x = x;
    this.y = y;
    this.currentX = x;
    this.currentY = y;
    this.wobbleOffset = Phaser.Math.Between(0, 360);
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
    this.container = scene.add.container(x, y, [shadow, this.stone, labelText, this.crack]).setDepth(y);
  }

  get isCleared() {
    return this.cleared;
  }

  get position(): Position {
    return { x: this.currentX, y: this.currentY };
  }

  update(timeMs: number, deltaMs = 16, target?: Position) {
    if (this.cleared) return;
    const homeX = this.x + Math.sin((timeMs + this.wobbleOffset) / 720) * 7;
    const homeY = this.y + Math.cos((timeMs + this.wobbleOffset) / 860) * 4;
    let desiredX = homeX;
    let desiredY = homeY;
    if (target) {
      const dx = target.x - this.currentX;
      const dy = target.y - this.currentY;
      const distance = Math.hypot(dx, dy);
      if (distance < 62 && distance > 1) {
        desiredX += (dx / distance) * 12;
        desiredY += (dy / distance) * 9;
      }
    }
    const maxDrift = 18;
    desiredX = Phaser.Math.Clamp(desiredX, this.x - maxDrift, this.x + maxDrift);
    desiredY = Phaser.Math.Clamp(desiredY, this.y - maxDrift, this.y + maxDrift);
    const speed = (timeMs < this.alertUntil ? 32 : 14) * (deltaMs / 1000);
    this.currentX = Phaser.Math.Linear(this.currentX, desiredX, Phaser.Math.Clamp(speed, 0.02, 0.22));
    this.currentY = Phaser.Math.Linear(this.currentY, desiredY, Phaser.Math.Clamp(speed, 0.02, 0.22));
    const bob = Math.sin((timeMs + this.wobbleOffset) / 180) * 1.3;
    const renderX = snapPixel(this.currentX);
    const renderY = snapPixel(this.currentY + bob);
    setPixelPosition(this.container, renderX, renderY);
    this.container.setDepth(renderY);
    this.stone.setTint(timeMs < this.alertUntil ? color(PALETTE.buckramHighlight) : 0xffffff);
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
