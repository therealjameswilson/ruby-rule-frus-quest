import Phaser from "phaser";
import { danneAnimKey } from "../art/danne_anims";
import { GAME_HEIGHT, GAME_WIDTH, PALETTE, type ProcessItemId } from "../game/constants";
import { unlockCodexEntry } from "../game/codex";
import { DANNE_VFX_ASSETS } from "../game/danneAtlas";
import {
  addDocumentPoints,
  addVolumeFragment,
  awardProcessStamp,
  setLatestMessage
} from "../game/state";
import type { Position } from "../game/types";
import { retroAudio } from "../systems/audio";
import { telegraphDurationMs, telegraphPhase, type TelegraphPhase, type TelegraphTiming } from "../systems/enemyCombat";
import { snapPixel } from "../systems/pixelPerfect";
import type { DanneEnemyVariantConfig } from "./danneVariants";

export type DanneEnemyState = "patrol" | "chase" | "stunned" | "defeated";

export interface DanneEnemyUpdateResult {
  projectileHit: boolean;
  contactHit: boolean;
}

interface DanneEnemyOptions {
  id: string;
  roomId: string;
  config: DanneEnemyVariantConfig;
  waypoints: Position[];
}

interface DanneAiContext {
  enemy: DanneEnemy;
  player: Position;
  timeMs: number;
  deltaMs: number;
}

interface DanneProjectile {
  sprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Rectangle;
  vx: number;
  vy: number;
  expiresAt: number;
  armed: boolean;
}

const EGO_BOLT = DANNE_VFX_ASSETS[0];
const PROJECTILE_SPEED = 34;
const PROJECTILE_COOLDOWN_MS = 1750;
const STUN_MS = 190;
const MELEE_START_DISTANCE = 28;
const MELEE_MIN_DISTANCE = 20;
const MELEE_COOLDOWN_MS = 950;
const MELEE_TELEGRAPH: TelegraphTiming = {
  windupMs: 360,
  activeMs: 110,
  recoveryMs: 290
};

function color(hex: string) {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

function vectorToward(from: Position, to: Position, speed: number) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.max(1, Math.hypot(dx, dy));
  return { vx: (dx / length) * speed, vy: (dy / length) * speed };
}

function moveToward(enemy: DanneEnemy, target: Position, deltaMs: number, speed = enemy.speed) {
  const dx = target.x - enemy.x;
  const dy = target.y - enemy.y;
  const distance = Math.max(1, Math.hypot(dx, dy));
  const dt = Math.min(0.05, deltaMs / 1000);
  enemy.setVelocity((dx / distance) * speed, (dy / distance) * speed);
  enemy.setPosition(snapPixel(enemy.x + enemy.velocity.x * dt), snapPixel(enemy.y + enemy.velocity.y * dt));
}

export function patrolDanneAi({ enemy, deltaMs }: DanneAiContext) {
  const waypoint = enemy.currentWaypoint;
  if (!waypoint) {
    enemy.setVelocity(0, 0);
    return;
  }
  if (Phaser.Math.Distance.Between(enemy.x, enemy.y, waypoint.x, waypoint.y) <= 4) {
    enemy.advanceWaypoint();
    return;
  }
  moveToward(enemy, waypoint, deltaMs);
}

export function chaseDanneAi(context: DanneAiContext) {
  const distance = Phaser.Math.Distance.Between(context.enemy.x, context.enemy.y, context.player.x, context.player.y);
  if (distance <= context.enemy.aggroRadius) {
    context.enemy.state = "chase";
    if (context.enemy.meleeSequenceActive) {
      context.enemy.setVelocity(0, 0);
    } else if (distance < MELEE_MIN_DISTANCE) {
      context.enemy.backAwayFrom(context.player, context.deltaMs);
    } else if (distance <= MELEE_START_DISTANCE) {
      context.enemy.setVelocity(0, 0);
      context.enemy.beginMeleeAttack(context.player, context.timeMs);
    } else {
      moveToward(context.enemy, context.player, context.deltaMs, context.enemy.speed + 8);
    }
    return;
  }
  context.enemy.state = "patrol";
  patrolDanneAi(context);
}

export function turretDanneAi({ enemy, player, timeMs }: DanneAiContext) {
  enemy.setVelocity(0, 0);
  const distance = Phaser.Math.Distance.Between(enemy.x, enemy.y, player.x, player.y);
  if (distance <= enemy.aggroRadius) enemy.fireProjectileAt(player, timeMs);
}

export class DanneEnemy extends Phaser.GameObjects.Sprite {
  readonly id: string;
  readonly roomId: string;
  readonly maxHp: number;
  readonly speed: number;
  readonly weakness: ProcessItemId;
  readonly aggroRadius: number;
  state: DanneEnemyState = "patrol";
  private hp: number;
  private waypointIndex = 0;
  private readonly waypoints: Position[];
  private readonly hpBack: Phaser.GameObjects.Rectangle;
  private readonly hpFill: Phaser.GameObjects.Rectangle;
  private readonly label: Phaser.GameObjects.Text;
  private readonly shadow: Phaser.GameObjects.Ellipse;
  private readonly attackRing: Phaser.GameObjects.Ellipse;
  private readonly attackMark: Phaser.GameObjects.Text;
  private readonly projectiles: DanneProjectile[] = [];
  private readonly config: DanneEnemyVariantConfig;
  private stunnedUntil = 0;
  private nextProjectileAt = 0;
  private nextToolHitAt = 0;
  private lastPlayerSwingId = -1;
  private nextMeleeAt = 0;
  private meleeStartedAt: number | null = null;
  private meleeHitApplied = false;
  private meleeDirection = { x: 0, y: 1 };
  private lastAttackPhase: TelegraphPhase = "idle";

  constructor(scene: Phaser.Scene, x: number, y: number, options: DanneEnemyOptions) {
    super(scene, x, y, scene.textures.exists(options.config.textureKey) ? options.config.textureKey : "snes-wall-danne-queue");
    this.id = options.id;
    this.roomId = options.roomId;
    this.config = options.config;
    this.maxHp = options.config.maxHp;
    this.hp = options.config.maxHp;
    this.speed = options.config.speed;
    this.weakness = options.config.weakness;
    this.aggroRadius = options.config.aggroRadius;
    this.waypoints = options.waypoints.length ? options.waypoints.map((point) => ({ ...point })) : [{ x, y }];

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setOrigin(0.5, 0.82)
      .setScale(options.config.scale)
      .setDepth(Math.round(y))
      .setName(`danne-enemy-${options.id}`);
    const body = this.arcadeBody();
    body.setAllowGravity(false);
    body.setImmovable(true);
    body.setSize(options.config.body.width, options.config.body.height);
    body.setOffset(options.config.body.offsetX, options.config.body.offsetY);

    const walkKey = danneAnimKey(options.config.textureKey, "walk-down");
    if (scene.anims.exists(walkKey)) this.play(walkKey);

    this.shadow = scene.add.ellipse(x, y + 11, 20, 6, color(PALETTE.black), 0.36).setDepth(Math.round(y - 2));
    this.hpBack = scene.add.rectangle(x, y - 28, 24, 4, color(PALETTE.black), 0.88)
      .setStrokeStyle(1, color(PALETTE.goldStamp))
      .setDepth(920)
      .setVisible(false);
    this.hpFill = scene.add.rectangle(x - 11, y - 28, 22, 2, color(PALETTE.classNetRed), 1)
      .setOrigin(0, 0.5)
      .setDepth(921)
      .setVisible(false);
    this.label = scene.add.text(x, y + 15, options.config.displayName.toUpperCase(), {
      fontFamily: "monospace",
      fontSize: "4px",
      color: PALETTE.creamPaper,
      backgroundColor: PALETTE.black
    }).setOrigin(0.5, 0).setDepth(922);
    this.attackRing = scene.add.ellipse(x, y, 30, 20)
      .setStrokeStyle(2, color(PALETTE.goldStamp), 0.95)
      .setDepth(918)
      .setVisible(false);
    this.attackMark = scene.add.text(x, y - 30, "!", {
      fontFamily: "monospace",
      fontSize: "8px",
      color: PALETTE.goldStamp,
      backgroundColor: PALETTE.black
    }).setOrigin(0.5).setDepth(923).setVisible(false);
    this.nextMeleeAt = scene.time.now + 1800;
    this.nextProjectileAt = scene.time.now + 1350;

    unlockCodexEntry(options.config.codexEntryId);
    this.syncUi();
  }

  get currentHp() {
    return this.hp;
  }

  get defeated() {
    return this.state === "defeated";
  }

  get currentWaypoint() {
    return this.waypoints[this.waypointIndex] ?? null;
  }

  get meleeSequenceActive() {
    return this.meleeStartedAt !== null;
  }

  get velocity() {
    const body = this.arcadeBody();
    return { x: body.velocity.x, y: body.velocity.y };
  }

  advanceWaypoint() {
    if (!this.waypoints.length) return;
    this.waypointIndex = (this.waypointIndex + 1) % this.waypoints.length;
  }

  setVelocity(x: number, y: number) {
    this.arcadeBody().setVelocity(x, y);
    return this;
  }

  backAwayFrom(target: Position, deltaMs: number) {
    const dx = this.x - target.x;
    const dy = this.y - target.y;
    const distance = Math.max(1, Math.hypot(dx, dy));
    const dt = Math.min(0.05, deltaMs / 1000);
    this.setVelocity((dx / distance) * this.speed, (dy / distance) * this.speed);
    this.setPosition(
      snapPixel(this.x + this.velocity.x * dt),
      snapPixel(this.y + this.velocity.y * dt)
    );
  }

  beginMeleeAttack(target: Position, timeMs: number) {
    if (this.meleeSequenceActive || timeMs < this.nextMeleeAt) return false;
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const distance = Math.max(1, Math.hypot(dx, dy));
    this.meleeDirection = { x: dx / distance, y: dy / distance };
    this.meleeStartedAt = timeMs;
    this.meleeHitApplied = false;
    this.nextMeleeAt = timeMs + telegraphDurationMs(MELEE_TELEGRAPH) + MELEE_COOLDOWN_MS;
    retroAudio.blip();
    return true;
  }

  updateEnemy(timeMs: number, deltaMs: number, player: Position, playerFootBox: Phaser.Geom.Rectangle): DanneEnemyUpdateResult {
    if (this.defeated) return { projectileHit: false, contactHit: false };
    if (timeMs < this.stunnedUntil) {
      this.state = "stunned";
      this.setVelocity(0, 0);
      this.cancelMeleeAttack();
    } else if (this.config.ai === "chase") {
      chaseDanneAi({ enemy: this, player, timeMs, deltaMs });
    } else if (this.config.ai === "turret") {
      turretDanneAi({ enemy: this, player, timeMs, deltaMs });
    } else {
      this.state = "patrol";
      patrolDanneAi({ enemy: this, player, timeMs, deltaMs });
    }
    this.playFacingAnim();
    this.clampToRoom();
    const contactHit = this.resolveMeleeAttack(timeMs, playerFootBox);
    this.syncUi(timeMs);
    return {
      projectileHit: this.updateProjectiles(timeMs, deltaMs, playerFootBox),
      contactHit
    };
  }

  tryPlayerToolHit(hitbox: Phaser.Geom.Rectangle | null, equippedTool: ProcessItemId | null, source: Position, swingId: number) {
    if (this.defeated || !hitbox || !Phaser.Geom.Intersects.RectangleToRectangle(this.getHurtbox(), hitbox)) return "miss" as const;
    if (swingId === this.lastPlayerSwingId) return "cooldown" as const;
    if (this.scene.time.now < this.nextToolHitAt) return "cooldown" as const;
    this.lastPlayerSwingId = swingId;
    this.nextToolHitAt = this.scene.time.now + 170;
    const correctTool = equippedTool === this.weakness;
    this.knockbackFrom(source, correctTool ? 7 : 12);
    this.stunnedUntil = this.scene.time.now + STUN_MS;
    if (!correctTool) {
      this.flash(PALETTE.stoneGray);
      setLatestMessage(`${this.config.displayName} resists. Need ${this.weaknessLabel()}.`);
      retroAudio.warning();
      return "wrong-tool" as const;
    }
    this.takeDamage(1, equippedTool);
    return this.defeated ? "defeated" as const : "damaged" as const;
  }

  fireProjectileAt(target: Position, timeMs: number) {
    if (timeMs < this.nextProjectileAt || this.projectiles.length >= 2) return false;
    this.nextProjectileAt = timeMs + PROJECTILE_COOLDOWN_MS;
    const start = { x: Math.round(this.x), y: Math.round(this.y - 9) };
    const velocity = vectorToward(start, target, PROJECTILE_SPEED);
    const frame = Math.abs(velocity.vx) > Math.abs(velocity.vy) ? 0 : 4;
    const sprite = this.scene.textures.exists(EGO_BOLT.key)
      ? this.scene.add.sprite(start.x, start.y, EGO_BOLT.key, frame).setScale(0.04)
      : this.scene.add.rectangle(start.x, start.y, 12, 7, color(PALETTE.classNetRed), 0.92);
    sprite.setDepth(Math.round(start.y + 8));
    if (sprite instanceof Phaser.GameObjects.Sprite && this.scene.anims.exists(danneAnimKey(EGO_BOLT.key, "fly"))) {
      sprite.play(danneAnimKey(EGO_BOLT.key, "fly"));
    }
    this.projectiles.push({
      sprite,
      vx: velocity.vx,
      vy: velocity.vy,
      expiresAt: timeMs + 2100,
      armed: true
    });
    retroAudio.egoBoltFire();
    return true;
  }

  defeat() {
    if (this.defeated) return;
    this.state = "defeated";
    this.lastAttackPhase = "idle";
    this.setActive(false).setVisible(false);
    this.arcadeBody().enable = false;
    this.shadow.setVisible(false);
    this.attackRing.setVisible(false);
    this.attackMark.setVisible(false);
    this.hpBack.setVisible(false);
    this.hpFill.setVisible(false);
    this.label.setVisible(false);
    for (const projectile of this.projectiles.splice(0)) projectile.sprite.destroy();
    this.spawnLoot();
    this.destroy();
  }

  destroy(fromScene?: boolean) {
    this.shadow.destroy();
    this.hpBack.destroy();
    this.hpFill.destroy();
    this.label.destroy();
    this.attackRing.destroy();
    this.attackMark.destroy();
    for (const projectile of this.projectiles.splice(0)) projectile.sprite.destroy();
    super.destroy(fromScene);
  }

  readout() {
    return {
      id: this.id,
      label: this.config.displayName,
      x: Math.round(this.x),
      y: Math.round(this.y),
      hp: this.hp,
      maxHp: this.maxHp,
      state: this.state,
      attackPhase: this.lastAttackPhase,
      weakness: this.weakness,
      behavior: this.config.behavior,
      defeatMethod: this.config.defeatMethod
    };
  }

  private takeDamage(amount: number, tool: ProcessItemId) {
    this.hp = Math.max(0, this.hp - amount);
    this.flash(PALETTE.white);
    retroAudio.toolHit(tool);
    if (this.hp <= 0) {
      retroAudio.bossDefeat();
      this.defeat();
    } else {
      retroAudio.bossHit();
      setLatestMessage(`${this.config.displayName}: ${this.hp}/${this.maxHp} HP.`);
    }
  }

  private getHurtbox() {
    return new Phaser.Geom.Rectangle(this.x - 11, this.y - 15, 22, 24);
  }

  private updateProjectiles(timeMs: number, deltaMs: number, playerFootBox: Phaser.Geom.Rectangle) {
    const dt = Math.min(0.05, deltaMs / 1000);
    let hit = false;
    for (let index = this.projectiles.length - 1; index >= 0; index -= 1) {
      const projectile = this.projectiles[index];
      const x = snapPixel(projectile.sprite.x + projectile.vx * dt);
      const y = snapPixel(projectile.sprite.y + projectile.vy * dt);
      projectile.sprite.setPosition(x, y);
      projectile.sprite.setDepth(Math.round(y + 8));
      const bounds = new Phaser.Geom.Rectangle(x - 6, y - 6, 12, 12);
      if (projectile.armed && Phaser.Geom.Intersects.RectangleToRectangle(bounds, playerFootBox)) {
        hit = true;
        projectile.armed = false;
      }
      if (!projectile.armed || timeMs >= projectile.expiresAt || x < -16 || x > GAME_WIDTH + 16 || y < 10 || y > GAME_HEIGHT + 16) {
        projectile.sprite.destroy();
        this.projectiles.splice(index, 1);
      }
    }
    return hit;
  }

  private resolveMeleeAttack(timeMs: number, playerFootBox: Phaser.Geom.Rectangle) {
    if (this.meleeStartedAt === null) return false;
    const elapsed = timeMs - this.meleeStartedAt;
    if (elapsed >= telegraphDurationMs(MELEE_TELEGRAPH)) {
      this.cancelMeleeAttack();
      return false;
    }
    if (this.meleePhase(timeMs) !== "active" || this.meleeHitApplied) return false;
    this.meleeHitApplied = true;
    return Phaser.Geom.Intersects.RectangleToRectangle(this.meleeHitbox(), playerFootBox);
  }

  private meleePhase(timeMs: number) {
    return telegraphPhase(this.meleeStartedAt, timeMs, MELEE_TELEGRAPH);
  }

  private meleeHitbox() {
    const centerX = this.x + this.meleeDirection.x * 17;
    const centerY = this.y + this.meleeDirection.y * 14;
    return new Phaser.Geom.Rectangle(centerX - 12, centerY - 9, 24, 18);
  }

  private cancelMeleeAttack() {
    this.meleeStartedAt = null;
    this.meleeHitApplied = false;
  }

  private knockbackFrom(source: Position, distance: number) {
    const dx = this.x - source.x;
    const dy = this.y - source.y;
    const length = Math.max(1, Math.hypot(dx, dy));
    this.setPosition(snapPixel(this.x + (dx / length) * distance), snapPixel(this.y + (dy / length) * distance));
  }

  private spawnLoot() {
    const loot = this.config.loot;
    if (loot.documentPoints) addDocumentPoints(loot.documentPoints, `${this.config.displayName} defeated`);
    if (loot.processStamp) awardProcessStamp(loot.processStamp);
    if (loot.volumeFragment) addVolumeFragment(loot.volumeFragment);
    const burst = this.scene.add.text(this.x, this.y - 20, loot.volumeFragment ? "FRAGMENT" : "CLEARED", {
      fontFamily: "monospace",
      fontSize: "6px",
      color: PALETTE.goldStamp,
      backgroundColor: PALETTE.black
    }).setOrigin(0.5).setDepth(940);
    this.scene.tweens.add({
      targets: burst,
      y: burst.y - 12,
      alpha: 0,
      duration: 620,
      ease: "Stepped",
      onComplete: () => burst.destroy()
    });
    setLatestMessage(`${this.config.displayName} cleared by ${this.weaknessLabel()}.`);
  }

  private flash(hex: string) {
    this.setTint(color(hex));
    this.scene.time.delayedCall(90, () => {
      if (this.active && !this.defeated) this.clearTint();
    });
  }

  private playFacingAnim() {
    const body = this.arcadeBody();
    const vx = body.velocity.x;
    const vy = body.velocity.y;
    let direction = "down";
    if (Math.abs(vx) > Math.abs(vy)) direction = vx < 0 ? "left" : "right";
    else if (Math.abs(vy) > 0.1) direction = vy < 0 ? "up" : "down";
    const animDirection = direction === "right" ? "walk-right" : `walk-${direction}`;
    const key = danneAnimKey(this.config.textureKey, animDirection);
    if (this.scene.anims.exists(key) && this.anims.currentAnim?.key !== key) this.play(key);
    this.setFlipX(direction === "right" && !this.scene.anims.exists(danneAnimKey(this.config.textureKey, "walk-right")));
  }

  private clampToRoom() {
    this.setPosition(
      snapPixel(Phaser.Math.Clamp(this.x, 10, GAME_WIDTH - 10)),
      snapPixel(Phaser.Math.Clamp(this.y, 38, GAME_HEIGHT - 22))
    );
    this.setDepth(Math.round(this.y));
  }

  private syncUi(timeMs = this.scene.time.now) {
    const x = snapPixel(this.x);
    const y = snapPixel(this.y);
    this.shadow.setPosition(x, y + 11).setDepth(Math.round(y - 2));
    const hpVisible = this.hp > 0 && this.hp < this.maxHp;
    const labelVisible = hpVisible || this.isDebugLabelVisible();
    this.label.setVisible(labelVisible).setPosition(x, y + 15).setDepth(Math.round(y + 18));
    this.hpBack.setVisible(hpVisible).setPosition(x, y - 28);
    this.hpFill.setVisible(hpVisible).setPosition(x - 11, y - 28).setSize(Math.max(1, Math.round(22 * (this.hp / this.maxHp))), 2);
    const attackPhase = this.meleePhase(timeMs);
    this.lastAttackPhase = attackPhase;
    const attacking = attackPhase !== "idle";
    const cueColor = attackPhase === "active"
      ? PALETTE.classNetRed
      : attackPhase === "recovery"
        ? PALETTE.stoneGray
        : PALETTE.goldStamp;
    this.attackRing
      .setVisible(attacking)
      .setPosition(x + this.meleeDirection.x * 8, y + this.meleeDirection.y * 6)
      .setStrokeStyle(2, color(cueColor), attackPhase === "recovery" ? 0.55 : 0.95)
      .setDepth(Math.round(y + 12));
    this.attackMark
      .setVisible(attackPhase === "windup" || attackPhase === "active")
      .setPosition(x, y - 30)
      .setColor(cueColor);
  }

  private weaknessLabel() {
    return this.weakness.replace(/_/g, " ").toUpperCase();
  }

  private isDebugLabelVisible() {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).get("debug") === "threats";
  }

  private arcadeBody() {
    return this.body as Phaser.Physics.Arcade.Body;
  }
}
