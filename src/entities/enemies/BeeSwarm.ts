import Phaser from "phaser";
import { PALETTE } from "../../game/constants";
import type { Position } from "../../game/types";
import { setPixelPosition, snapPixel } from "../../systems/pixelPerfect";
import { approach, frameDeltaSeconds } from "../../systems/smoothMovement";

function color(hex: string) {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

export class BeeSwarm {
  readonly label = "Bees";
  readonly spriteKey = "snes-frus-bees";
  private readonly scene: Phaser.Scene;
  private readonly container: Phaser.GameObjects.Container;
  private readonly sprite: Phaser.GameObjects.Image;
  private readonly cue: Phaser.GameObjects.Text;
  private readonly waypoints: Position[] = [
    { x: 162, y: 166 },
    { x: 116, y: 142 },
    { x: 74, y: 164 },
    { x: 111, y: 190 },
    { x: 172, y: 192 },
    { x: 216, y: 158 },
    { x: 188, y: 120 },
    { x: 134, y: 116 }
  ];
  private waypointIndex = 0;
  private currentX: number;
  private currentY: number;
  private velocityX = 0;
  private velocityY = 0;
  private nextBuzzAt = 0;
  private buzzingUntil = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.currentX = x;
    this.currentY = y;
    this.waypoints[0] = { x, y };
    const shadow = scene.add.ellipse(0, 12, 18, 5, color(PALETTE.black));
    this.sprite = scene.add.image(0, 0, scene.textures.exists(this.spriteKey) ? this.spriteKey : "source-note");
    const tag = scene.add.text(0, 15, "BEES", {
      fontFamily: "monospace",
      fontSize: "5px",
      color: PALETTE.black,
      backgroundColor: PALETTE.goldStamp
    }).setOrigin(0.5);
    this.cue = scene.add.text(0, -20, "BUZZ", {
      fontFamily: "monospace",
      fontSize: "6px",
      color: PALETTE.goldStamp,
      backgroundColor: PALETTE.black
    }).setOrigin(0.5).setVisible(false);
    this.container = scene.add.container(x, y, [shadow, this.sprite, tag, this.cue]).setDepth(y);
  }

  get position(): Position {
    return { x: snapPixel(this.currentX), y: snapPixel(this.currentY) };
  }

  update(timeMs: number, deltaMs: number, player: Position, canBuzz: boolean) {
    this.fly(deltaMs, timeMs);
    const distance = Phaser.Math.Distance.Between(this.currentX, this.currentY, player.x, player.y);
    const triggered = canBuzz && distance <= 24 && timeMs >= this.nextBuzzAt;
    if (triggered) {
      this.nextBuzzAt = timeMs + 3000;
      this.buzzingUntil = timeMs + 900;
      this.scene.tweens.add({
        targets: this.container,
        x: snapPixel(this.currentX + 3),
        duration: 35,
        yoyo: true,
        repeat: 5,
        ease: "Stepped"
      });
    }

    const active = timeMs < this.buzzingUntil;
    this.cue.setVisible(active);
    if (active && Math.floor(timeMs / 80) % 2 === 0) this.sprite.setTint(color(PALETTE.goldStamp));
    else if (active) this.sprite.setTint(color(PALETTE.terminalCyan));
    else this.sprite.clearTint();

    const jitterX = Math.sin(timeMs / 95) * 1.1;
    const jitterY = Math.cos(timeMs / 120) * 0.9;
    const renderX = snapPixel(this.currentX + jitterX);
    const renderY = snapPixel(this.currentY + jitterY);
    setPixelPosition(this.container, renderX, renderY);
    this.container.setDepth(renderY);
    return triggered;
  }

  status(timeMs: number) {
    return timeMs < this.buzzingUntil ? "buzzing" : "swarming";
  }

  destroy() {
    this.container.destroy();
  }

  private fly(deltaMs: number, timeMs: number) {
    const target = this.waypoints[this.waypointIndex];
    const dx = target.x - this.currentX;
    const dy = target.y - this.currentY;
    const distance = Math.hypot(dx, dy);
    if (distance < 4) {
      this.waypointIndex = (this.waypointIndex + 1) % this.waypoints.length;
      return;
    }
    const dt = frameDeltaSeconds(deltaMs);
    const targetVelocityX = (dx / Math.max(1, distance)) * 30;
    const targetVelocityY = (dy / Math.max(1, distance)) * 30;
    this.velocityX = approach(this.velocityX, targetVelocityX, 95 * dt);
    this.velocityY = approach(this.velocityY, targetVelocityY, 95 * dt);
    this.currentX += this.velocityX * dt;
    this.currentY += this.velocityY * dt;
    this.sprite.setFlipX(this.velocityX < -0.5);
  }
}
