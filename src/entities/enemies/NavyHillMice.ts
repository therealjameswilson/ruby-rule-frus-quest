import Phaser from "phaser";
import { PALETTE } from "../../game/constants";
import type { Position } from "../../game/types";
import { setPixelPosition, snapPixel } from "../../systems/pixelPerfect";
import { approach, frameDeltaSeconds } from "../../systems/smoothMovement";

function color(hex: string) {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

export class NavyHillMice {
  readonly label = "Navy Hill mice";
  readonly spriteKey = "snes-navy-hill-mice";
  private readonly scene: Phaser.Scene;
  private readonly container: Phaser.GameObjects.Container;
  private readonly sprite: Phaser.GameObjects.Image;
  private readonly cue: Phaser.GameObjects.Text;
  private readonly waypoints: Position[] = [
    { x: 39, y: 132 },
    { x: 64, y: 124 },
    { x: 82, y: 143 },
    { x: 68, y: 160 },
    { x: 41, y: 156 },
    { x: 30, y: 141 }
  ];
  private waypointIndex = 0;
  private currentX: number;
  private currentY: number;
  private velocityX = 0;
  private velocityY = 0;
  private nextScatterAt = 0;
  private scatteringUntil = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.currentX = x;
    this.currentY = y;
    this.waypoints[0] = { x, y };
    const shadow = scene.add.ellipse(0, 12, 18, 5, color(PALETTE.black));
    this.sprite = scene.add.image(0, 0, scene.textures.exists(this.spriteKey) ? this.spriteKey : "source-note");
    const tag = scene.add.text(0, 15, "MICE", {
      fontFamily: "monospace",
      fontSize: "5px",
      color: PALETTE.black,
      backgroundColor: PALETTE.creamPaper
    }).setOrigin(0.5);
    this.cue = scene.add.text(0, -20, "SCATTER", {
      fontFamily: "monospace",
      fontSize: "6px",
      color: PALETTE.creamPaper,
      backgroundColor: PALETTE.deepRuby
    }).setOrigin(0.5).setVisible(false);
    this.container = scene.add.container(x, y, [shadow, this.sprite, tag, this.cue]).setDepth(y);
  }

  get position(): Position {
    return { x: snapPixel(this.currentX), y: snapPixel(this.currentY) };
  }

  update(timeMs: number, deltaMs: number, player: Position, canScatter: boolean) {
    this.scurry(deltaMs);
    const distance = Phaser.Math.Distance.Between(this.currentX, this.currentY, player.x, player.y);
    const triggered = canScatter && distance <= 23 && timeMs >= this.nextScatterAt;
    if (triggered) {
      this.nextScatterAt = timeMs + 3600;
      this.scatteringUntil = timeMs + 950;
      this.scene.tweens.add({
        targets: this.container,
        x: snapPixel(this.currentX - 3),
        duration: 40,
        yoyo: true,
        repeat: 5,
        ease: "Stepped"
      });
    }

    const active = timeMs < this.scatteringUntil;
    this.cue.setVisible(active);
    if (active && Math.floor(timeMs / 90) % 2 === 0) this.sprite.setTint(color(PALETTE.creamPaper));
    else if (active) this.sprite.setTint(color(PALETTE.goldStamp));
    else this.sprite.clearTint();

    const wiggleX = Math.sin(timeMs / 110) * 0.7;
    const wiggleY = Math.cos(timeMs / 145) * 0.5;
    const renderX = snapPixel(this.currentX + wiggleX);
    const renderY = snapPixel(this.currentY + wiggleY);
    setPixelPosition(this.container, renderX, renderY);
    this.container.setDepth(renderY);
    return triggered;
  }

  status(timeMs: number) {
    return timeMs < this.scatteringUntil ? "scattering source notes" : "scurrying";
  }

  destroy() {
    this.container.destroy();
  }

  private scurry(deltaMs: number) {
    const target = this.waypoints[this.waypointIndex];
    const dx = target.x - this.currentX;
    const dy = target.y - this.currentY;
    const distance = Math.hypot(dx, dy);
    if (distance < 3) {
      this.waypointIndex = (this.waypointIndex + 1) % this.waypoints.length;
      return;
    }
    const dt = frameDeltaSeconds(deltaMs);
    const targetVelocityX = (dx / Math.max(1, distance)) * 26;
    const targetVelocityY = (dy / Math.max(1, distance)) * 26;
    this.velocityX = approach(this.velocityX, targetVelocityX, 88 * dt);
    this.velocityY = approach(this.velocityY, targetVelocityY, 88 * dt);
    this.currentX += this.velocityX * dt;
    this.currentY += this.velocityY * dt;
    this.sprite.setFlipX(this.velocityX < -0.5);
  }
}
