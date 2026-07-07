import Phaser from "phaser";
import { ACCESSIBILITY_OVERLAYS } from "../../assets/registry";
import { PALETTE } from "../../game/constants";
import type { Position } from "../../game/types";
import { isColorblindModeEnabled } from "../../systems/accessibilitySettings";
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
  private readonly maxHealth: number;
  private readonly hpBack: Phaser.GameObjects.Rectangle;
  private readonly hpFill: Phaser.GameObjects.Rectangle;
  private readonly hpPattern?: Phaser.GameObjects.TileSprite;
  private readonly weaknessIcon?: Phaser.GameObjects.Image;
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
    this.maxHealth = Math.max(1, this.health);
    this.waypoints = options.waypoints.map((point) => ({ ...point }));
    if (this.waypoints.length) this.waypoints[0] = { x, y };

    const shadowOptions = options.shadow ?? { y: 15, width: 18, height: 6 };
    const shadow = scene.add.ellipse(0, shadowOptions.y, shadowOptions.width, shadowOptions.height, color(PALETTE.black));
    this.sprite = scene.add.sprite(0, 0, scene.textures.exists(this.spriteKey) ? this.spriteKey : options.fallbackTextureKey);
    this.hpBack = scene.add.rectangle(0, -19, 22, 4, color(PALETTE.black), 0.9)
      .setStrokeStyle(1, color(PALETTE.stoneGray))
      .setVisible(false);
    this.hpFill = scene.add.rectangle(-10, -19, 20, 2, color(PALETTE.classNetRed), 0.95)
      .setOrigin(0, 0.5)
      .setVisible(false);
    this.hpPattern = scene.textures.exists("hp_cell_full" satisfies keyof typeof ACCESSIBILITY_OVERLAYS)
      ? scene.add.tileSprite(-10, -19, 20, 4, "hp_cell_full" satisfies keyof typeof ACCESSIBILITY_OVERLAYS)
        .setOrigin(0, 0.5)
        .setVisible(false)
      : undefined;
    this.weaknessIcon = scene.textures.exists("weakness_target" satisfies keyof typeof ACCESSIBILITY_OVERLAYS)
      ? scene.add.image(13, -20, "weakness_target" satisfies keyof typeof ACCESSIBILITY_OVERLAYS)
        .setScale(0.65)
        .setVisible(false)
      : undefined;
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
    this.container = scene.add.container(x, y, [
      shadow,
      this.sprite,
      this.hpBack,
      this.hpFill,
      ...(this.hpPattern ? [this.hpPattern] : []),
      ...(this.weaknessIcon ? [this.weaknessIcon] : []),
      tag,
      this.cue
    ]).setDepth(y);
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
    this.syncAccessibilityCombatFeedback();
    return { renderX, renderY };
  }

  private syncAccessibilityCombatFeedback() {
    const damaged = this.health < this.maxHealth;
    const highContrast = isColorblindModeEnabled();
    const ratio = Phaser.Math.Clamp(this.health / this.maxHealth, 0, 1);
    const width = Math.max(1, Math.round(20 * ratio));
    this.hpBack.setVisible(damaged);
    this.hpFill.setVisible(damaged).setSize(width, 2);
    this.hpPattern?.setVisible(damaged && highContrast).setSize(width, 4);
    this.weaknessIcon?.setVisible(damaged && highContrast);
  }

  protected color(hex: string) {
    return color(hex);
  }
}
