import Phaser from "phaser";
import { PALETTE } from "../game/constants";
import type { Position } from "../game/types";
import { setPixelPosition, snapPixel } from "../systems/pixelPerfect";
import { approach, frameDeltaSeconds } from "../systems/smoothMovement";

function color(hex: string) {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

export class FederalShutdown {
  readonly label = "Federal government shutdown";
  readonly spriteKey = "snes-federal-shutdown";
  private readonly scene: Phaser.Scene;
  private readonly container: Phaser.GameObjects.Container;
  private readonly sprite: Phaser.GameObjects.Image;
  private readonly cue: Phaser.GameObjects.Text;
  private readonly waypoints: Position[] = [
    { x: 214, y: 176 },
    { x: 164, y: 184 },
    { x: 122, y: 168 },
    { x: 72, y: 180 },
    { x: 44, y: 142 },
    { x: 91, y: 122 },
    { x: 166, y: 126 },
    { x: 214, y: 150 }
  ];
  private waypointIndex = 0;
  private currentX: number;
  private currentY: number;
  private velocityX = 0;
  private velocityY = 0;
  private nextClosureAt = 0;
  private closureUntil = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.currentX = x;
    this.currentY = y;
    this.waypoints[0] = { x, y };
    const shadow = scene.add.ellipse(0, 15, 20, 6, color(PALETTE.black));
    this.sprite = scene.add.image(0, 0, scene.textures.exists(this.spriteKey) ? this.spriteKey : "bureaucratic-wall");
    const tag = scene.add.text(0, 17, "STOP", {
      fontFamily: "monospace",
      fontSize: "5px",
      color: PALETTE.black,
      backgroundColor: PALETTE.goldStamp
    }).setOrigin(0.5);
    this.cue = scene.add.text(0, -23, "CLOSED", {
      fontFamily: "monospace",
      fontSize: "6px",
      color: PALETTE.goldStamp,
      backgroundColor: PALETTE.deepRuby
    }).setOrigin(0.5).setVisible(false);
    this.container = scene.add.container(x, y, [shadow, this.sprite, tag, this.cue]).setDepth(y);
  }

  get position(): Position {
    return { x: snapPixel(this.currentX), y: snapPixel(this.currentY) };
  }

  update(timeMs: number, deltaMs: number, player: Position, canImpede: boolean) {
    this.walk(deltaMs);
    const distance = Phaser.Math.Distance.Between(this.currentX, this.currentY, player.x, player.y);
    const triggered = canImpede && distance <= 27 && timeMs >= this.nextClosureAt;
    if (triggered) {
      this.nextClosureAt = timeMs + 5200;
      this.closureUntil = timeMs + 1250;
      this.scene.tweens.add({
        targets: this.container,
        y: snapPixel(this.currentY - 2),
        duration: 70,
        yoyo: true,
        repeat: 4,
        ease: "Stepped"
      });
    }
    const active = timeMs < this.closureUntil;
    this.cue.setVisible(active);
    if (active && Math.floor(timeMs / 120) % 2 === 0) this.sprite.setTint(color(PALETTE.goldStamp));
    else if (active) this.sprite.setTint(color(PALETTE.classNetRed));
    else this.sprite.clearTint();

    const bob = Math.sin(timeMs / 280) * 0.65;
    const renderX = snapPixel(this.currentX);
    const renderY = snapPixel(this.currentY + bob);
    setPixelPosition(this.container, renderX, renderY);
    this.container.setDepth(renderY);
    return { triggered, stopWorkActive: active };
  }

  status(timeMs: number) {
    return timeMs < this.closureUntil ? "stop-work order" : "roaming";
  }

  destroy() {
    this.container.destroy();
  }

  private walk(deltaMs: number) {
    const target = this.waypoints[this.waypointIndex];
    const dx = target.x - this.currentX;
    const dy = target.y - this.currentY;
    const distance = Math.hypot(dx, dy);
    if (distance < 3) {
      this.waypointIndex = (this.waypointIndex + 1) % this.waypoints.length;
      return;
    }
    const dt = frameDeltaSeconds(deltaMs);
    const targetVelocityX = (dx / Math.max(1, distance)) * 18;
    const targetVelocityY = (dy / Math.max(1, distance)) * 18;
    this.velocityX = approach(this.velocityX, targetVelocityX, 60 * dt);
    this.velocityY = approach(this.velocityY, targetVelocityY, 60 * dt);
    this.currentX += this.velocityX * dt;
    this.currentY += this.velocityY * dt;
    this.sprite.setFlipX(this.velocityX < -0.5);
  }
}
