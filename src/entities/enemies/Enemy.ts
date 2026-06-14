import Phaser from "phaser";
import { PALETTE } from "../../game/constants";
import type { Position } from "../../game/types";
import { snapPixel } from "../../systems/pixelPerfect";
import { approach, frameDeltaSeconds, setRenderedPosition, snapRenderedPosition } from "../../systems/smoothMovement";

interface EnemyOptions {
  label: string;
  spriteKey: string;
  fallbackTextureKey: string;
  waypoints: Position[];
  tag: {
    text: string;
    y: number;
    color: string;
    backgroundColor: string;
  };
  cue: {
    text: string;
    y: number;
    color: string;
    backgroundColor: string;
  };
  shadow?: {
    y: number;
    width: number;
    height: number;
  };
  speed: number;
  acceleration: number;
  waypointTolerance?: number;
  health?: number;
}

function color(hex: string) {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

export abstract class Enemy {
  readonly label: string;
  readonly spriteKey: string;
  protected readonly scene: Phaser.Scene;
  protected readonly container: Phaser.GameObjects.Container;
  protected readonly sprite: Phaser.GameObjects.Sprite;
  protected readonly cue: Phaser.GameObjects.Text;
  protected readonly waypoints: Position[];
  protected waypointIndex = 0;
  protected currentX: number;
  protected currentY: number;
  protected velocityX = 0;
  protected velocityY = 0;
  protected health: number;
  protected dead = false;
  private readonly speed: number;
  private readonly acceleration: number;
  private readonly waypointTolerance: number;

  constructor(scene: Phaser.Scene, x: number, y: number, options: EnemyOptions) {
    this.scene = scene;
    this.label = options.label;
    this.spriteKey = options.spriteKey;
    this.currentX = x;
    this.currentY = y;
    this.speed = options.speed;
    this.acceleration = options.acceleration;
    this.waypointTolerance = options.waypointTolerance ?? 3;
    this.health = options.health ?? 1;
    this.waypoints = options.waypoints.map((point) => ({ ...point }));
    if (this.waypoints.length) this.waypoints[0] = { x, y };

    const shadowOptions = options.shadow ?? { y: 15, width: 18, height: 6 };
    const shadow = scene.add.ellipse(0, shadowOptions.y, shadowOptions.width, shadowOptions.height, color(PALETTE.black));
    this.sprite = scene.add.sprite(0, 0, scene.textures.exists(this.spriteKey) ? this.spriteKey : options.fallbackTextureKey);
    const tag = scene.add.text(0, options.tag.y, options.tag.text, {
      fontFamily: "monospace",
      fontSize: "5px",
      color: options.tag.color,
      backgroundColor: options.tag.backgroundColor
    }).setOrigin(0.5);
    this.cue = scene.add.text(0, options.cue.y, options.cue.text, {
      fontFamily: "monospace",
      fontSize: "6px",
      color: options.cue.color,
      backgroundColor: options.cue.backgroundColor
    }).setOrigin(0.5).setVisible(false);
    this.container = scene.add.container(x, y, [shadow, this.sprite, tag, this.cue]).setDepth(y);
  }

  get position(): Position {
    return snapRenderedPosition({ x: this.currentX, y: this.currentY });
  }

  get isDead() {
    return this.dead;
  }

  takeDamage(amount = 1, source?: Position, knockbackDistance = 8) {
    if (this.dead) return false;
    this.health -= amount;
    if (source) this.knockbackFrom(source, knockbackDistance);
    if (this.health <= 0) {
      this.onDeath();
      return true;
    }
    this.scene.tweens.add({
      targets: this.container,
      alpha: 0.45,
      duration: 45,
      yoyo: true,
      repeat: 2,
      ease: "Stepped"
    });
    return false;
  }

  knockbackFrom(source: Position, distance = 8) {
    const dx = this.currentX - source.x;
    const dy = this.currentY - source.y;
    const length = Math.max(1, Math.hypot(dx, dy));
    this.currentX += (dx / length) * distance;
    this.currentY += (dy / length) * distance;
    this.velocityX = 0;
    this.velocityY = 0;
  }

  destroy() {
    this.container.destroy();
  }

  protected onDeath() {
    if (this.dead) return;
    this.dead = true;
    this.container.destroy();
  }

  protected moveTowardWaypoint(deltaMs: number) {
    if (this.dead || !this.waypoints.length) return;
    const target = this.waypoints[this.waypointIndex];
    const dx = target.x - this.currentX;
    const dy = target.y - this.currentY;
    const distance = Math.hypot(dx, dy);
    if (distance < this.waypointTolerance) {
      this.waypointIndex = (this.waypointIndex + 1) % this.waypoints.length;
      return;
    }
    const dt = frameDeltaSeconds(deltaMs);
    const targetVelocityX = (dx / Math.max(1, distance)) * this.speed;
    const targetVelocityY = (dy / Math.max(1, distance)) * this.speed;
    this.velocityX = approach(this.velocityX, targetVelocityX, this.acceleration * dt);
    this.velocityY = approach(this.velocityY, targetVelocityY, this.acceleration * dt);
    this.currentX += this.velocityX * dt;
    this.currentY += this.velocityY * dt;
    this.sprite.setFlipX(this.velocityX < -0.5);
  }

  protected distanceTo(position: Position) {
    return Phaser.Math.Distance.Between(this.currentX, this.currentY, position.x, position.y);
  }

  protected syncRender(timeMs: number, offsetX = 0, offsetY = 0) {
    const renderX = snapPixel(this.currentX + offsetX);
    const renderY = snapPixel(this.currentY + offsetY);
    setRenderedPosition(this.container, renderX, renderY);
    this.container.setDepth(renderY);
    return { renderX, renderY };
  }

  protected color(hex: string) {
    return color(hex);
  }
}
