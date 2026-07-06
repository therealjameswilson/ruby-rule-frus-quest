import Phaser from "phaser";
import { danneAnimKey } from "../art/danne_anims";
import { danneBoastsForVariantPhase } from "../game/danneBoasts";
import { GAME_HEIGHT, GAME_WIDTH, PALETTE, type ProcessItemId } from "../game/constants";
import { unlockCodexEntry } from "../game/codex";
import { DANNE_VFX_ASSETS } from "../game/danneAtlas";
import {
  addDocumentPoints,
  addVolumeFragment,
  awardVolumeAssemblyPieceForDanneVariant,
  awardProcessStamp,
  setLatestMessage
} from "../game/state";
import type { Position } from "../game/types";
import { retroAudio } from "../systems/audio";
import { snapPixel } from "../systems/pixelPerfect";
import type { DanneEnemyVariantConfig } from "./danneVariants";

export type DanneEnemyState = "patrol" | "chase" | "stunned" | "defeated";

export interface DanneEnemyUpdateResult {
  projectileHit: boolean;
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
const SCENE_TAUNT_THROTTLE_MS = 900;
const SCENE_TAUNT_NEXT_AT = new WeakMap<Phaser.Scene, number>();

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
    moveToward(context.enemy, context.player, context.deltaMs, context.enemy.speed + 8);
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
  private readonly projectiles: DanneProjectile[] = [];
  private readonly config: DanneEnemyVariantConfig;
  private readonly boastLines: readonly string[];
  private tauntBubble?: Phaser.GameObjects.Container;
  private hasSpottedPlayer = false;
  private nextTauntAt = 0;
  private stunnedUntil = 0;
  private nextProjectileAt = 0;
  private nextToolHitAt = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, options: DanneEnemyOptions) {
    super(scene, x, y, scene.textures.exists(options.config.textureKey) ? options.config.textureKey : "snes-wall-danne-queue");
    this.id = options.id;
    this.roomId = options.roomId;
    this.config = options.config;
    this.boastLines = danneBoastsForVariantPhase(options.config.phase);
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

  updateEnemy(timeMs: number, deltaMs: number, player: Position, playerFootBox: Phaser.Geom.Rectangle): DanneEnemyUpdateResult {
    if (this.defeated) return { projectileHit: false };
    const playerDistance = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
    if (!this.hasSpottedPlayer && playerDistance <= this.aggroRadius) {
      this.hasSpottedPlayer = true;
      this.maybeShowTaunt(timeMs, 1);
    }
    if (timeMs < this.stunnedUntil) {
      this.state = "stunned";
      this.setVelocity(0, 0);
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
    this.syncUi();
    return { projectileHit: this.updateProjectiles(timeMs, deltaMs, playerFootBox) };
  }

  tryPlayerToolHit(hitbox: Phaser.Geom.Rectangle | null, equippedTool: ProcessItemId | null, source: Position) {
    if (this.defeated || !hitbox || !Phaser.Geom.Intersects.RectangleToRectangle(this.getHurtbox(), hitbox)) return "miss" as const;
    if (this.scene.time.now < this.nextToolHitAt) return "cooldown" as const;
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
    this.setActive(false).setVisible(false);
    this.arcadeBody().enable = false;
    this.shadow.setVisible(false);
    this.hpBack.setVisible(false);
    this.hpFill.setVisible(false);
    this.label.setVisible(false);
    this.tauntBubble?.destroy();
    this.tauntBubble = undefined;
    for (const projectile of this.projectiles.splice(0)) projectile.sprite.destroy();
    this.spawnLoot();
    this.destroy();
  }

  destroy(fromScene?: boolean) {
    this.shadow.destroy();
    this.hpBack.destroy();
    this.hpFill.destroy();
    this.label.destroy();
    this.tauntBubble?.destroy();
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
      weakness: this.weakness,
      behavior: this.config.behavior,
      defeatMethod: this.config.defeatMethod
    };
  }

  private takeDamage(amount: number, tool: ProcessItemId) {
    this.hp = Math.max(0, this.hp - amount);
    this.flash(PALETTE.white);
    retroAudio.toolHit(tool);
    this.maybeShowTaunt(this.scene.time.now, 0.56);
    if (this.hp <= 0) this.defeat();
    else setLatestMessage(`${this.config.displayName}: ${this.hp}/${this.maxHp} HP.`);
  }

  private maybeShowTaunt(timeMs: number, chance: number) {
    if (!this.boastLines.length || timeMs < this.nextTauntAt || Math.random() > chance) return;
    const sceneNextTauntAt = SCENE_TAUNT_NEXT_AT.get(this.scene) ?? 0;
    if (timeMs < sceneNextTauntAt) return;
    const line = this.boastLines[Phaser.Math.Between(0, this.boastLines.length - 1)];
    this.showTauntBubble(line);
    this.nextTauntAt = timeMs + Phaser.Math.Between(4000, 6000);
    SCENE_TAUNT_NEXT_AT.set(this.scene, timeMs + SCENE_TAUNT_THROTTLE_MS);
  }

  private showTauntBubble(line: string) {
    this.tauntBubble?.destroy();
    const bubbleWidth = 104;
    const x = snapPixel(Phaser.Math.Clamp(this.x, bubbleWidth / 2 + 4, GAME_WIDTH - bubbleWidth / 2 - 4));
    const y = snapPixel(Phaser.Math.Clamp(this.y - 46, 32, GAME_HEIGHT - 58));
    const text = this.scene.add.text(0, 0, line, {
      fontFamily: "monospace",
      fontSize: "5px",
      color: PALETTE.creamPaper,
      align: "center",
      wordWrap: { width: bubbleWidth - 12, useAdvancedWrap: true },
      lineSpacing: -1
    }).setOrigin(0.5);
    const textBounds = text.getBounds();
    const height = Math.max(18, Math.ceil(textBounds.height) + 8);
    const back = this.scene.add.rectangle(0, 0, bubbleWidth, height, color(PALETTE.black), 0.9)
      .setStrokeStyle(1, color(PALETTE.goldStamp), 0.95);
    const header = this.scene.add.rectangle(0, -height / 2 + 2, bubbleWidth - 4, 2, color(PALETTE.deepRuby), 0.82);
    const pointer = this.scene.add.triangle(0, height / 2 + 4, 0, 0, 6, 0, 3, 5, color(PALETTE.black), 0.9)
      .setStrokeStyle(1, color(PALETTE.goldStamp), 0.85);
    this.tauntBubble = this.scene.add.container(x, y, [back, header, text, pointer])
      .setName(`danne-taunt-${this.id}`)
      .setDepth(960)
      .setAlpha(0);
    this.scene.tweens.add({
      targets: this.tauntBubble,
      alpha: 1,
      y: y - 2,
      duration: 90,
      ease: "Stepped"
    });
    this.scene.tweens.add({
      targets: this.tauntBubble,
      alpha: 0,
      y: y - 9,
      delay: 2050,
      duration: 240,
      ease: "Stepped",
      onComplete: () => {
        this.tauntBubble?.destroy();
        this.tauntBubble = undefined;
      }
    });
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
        retroAudio.egoBoltImpact();
      }
      if (!projectile.armed || timeMs >= projectile.expiresAt || x < -16 || x > GAME_WIDTH + 16 || y < 10 || y > GAME_HEIGHT + 16) {
        projectile.sprite.destroy();
        this.projectiles.splice(index, 1);
      }
    }
    return hit;
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
    const assembly = awardVolumeAssemblyPieceForDanneVariant(this.config.id, this.config.displayName);
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
    setLatestMessage(assembly.changed && assembly.piece
      ? `${this.config.displayName} cleared: ${assembly.piece.label} added to the FRUS binding.`
      : `${this.config.displayName} cleared by ${this.weaknessLabel()}.`);
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

  private syncUi() {
    const x = snapPixel(this.x);
    const y = snapPixel(this.y);
    this.shadow.setPosition(x, y + 11).setDepth(Math.round(y - 2));
    const hpVisible = this.hp > 0 && this.hp < this.maxHp;
    const labelVisible = hpVisible || this.isDebugLabelVisible();
    this.label.setVisible(labelVisible).setPosition(x, y + 15).setDepth(Math.round(y + 18));
    this.hpBack.setVisible(hpVisible).setPosition(x, y - 28);
    this.hpFill.setVisible(hpVisible).setPosition(x - 11, y - 28).setSize(Math.max(1, Math.round(22 * (this.hp / this.maxHp))), 2);
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
