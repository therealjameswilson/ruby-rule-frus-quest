import Phaser from "phaser";
import { danneAnimKey } from "../../art/danne_anims";
import { PALETTE } from "../../game/constants";
import { DANNE_RUNTIME_SPRITE_ASSETS } from "../../game/danneAtlas";
import { unlockCodexEntry } from "../../game/codex";
import { REDACTOR_DRONE_STAMP_TRIGGER_RADIUS } from "../../game/levelPacing";
import type { Position } from "../../game/types";
import { telegraphPhase, type TelegraphTiming } from "../../systems/enemyCombat";
import { frameDeltaSeconds } from "../../systems/smoothMovement";
import { Player } from "../Player";
import { Enemy } from "./Enemy";

const DRONE_ASSET = DANNE_RUNTIME_SPRITE_ASSETS.find((asset) => asset.entityId === "redactor-drone")!;

interface BlackBarProjectile {
  rect: Phaser.GameObjects.Rectangle;
  bounds: Phaser.Geom.Rectangle;
  startedAt: number;
  spent: boolean;
}

// The stamp telegraphs its landing zone before it can redact you, so a player
// standing on the drop has a fair window to step clear (ALTTP AoE tell).
export const DRONE_STAMP_TIMING: TelegraphTiming = { windupMs: 400, activeMs: 600, recoveryMs: 180 };

export class RedactorDrone extends Enemy {
  private nextStampAt = 0;
  private combatTime = 0;
  private projectiles: BlackBarProjectile[] = [];
  private facing: "down" | "up" | "left" | "right" = "down";

  constructor(scene: Phaser.Scene, x: number, y: number, waypoints: Position[], private readonly getSolids: () => readonly Phaser.Geom.Rectangle[] = () => []) {
    unlockCodexEntry("enemy-redactor-drone");
    super(scene, x, y, {
      label: "Redactor Drone",
      spriteKey: DRONE_ASSET.key,
      fallbackTextureKey: "bureaucratic-wall",
      waypoints,
      tag: { text: "DRONE", y: 17, color: PALETTE.classNetRed, backgroundColor: PALETTE.black, visible: false },
      cue: { text: "!", y: -27, color: PALETTE.goldStamp, backgroundColor: PALETTE.black },
      shadow: { y: 12, width: 20, height: 6 },
      speed: 22,
      acceleration: 90,
      waypointTolerance: 3,
      health: 2
    });
    this.sprite.setOrigin(0.5, 0.82).setScale(0.18);
    this.playWalk("down");
  }

  update(sceneTime: number, deltaMs: number, player: Player, canAct: boolean) {
    this.setCombatActive(canAct, sceneTime);
    // Gameplay time stops with the map/dialogue. A pending tell retains its
    // remaining reaction window instead of landing during or just after pause.
    if (!canAct || this.dead) return false;
    this.combatTime += frameDeltaSeconds(deltaMs) * 1000;
    const timeMs = this.combatTime;
    this.moveTowardWaypoint(deltaMs);
    this.updateFacing();
    this.playWalk(this.facing);
    const triggered = this.distanceTo(player.position) <= REDACTOR_DRONE_STAMP_TRIGGER_RADIUS
      && timeMs >= this.nextStampAt && this.canSee(player.position);
    if (triggered) this.dropBlackBar(timeMs, player.position);
    this.updateProjectiles(timeMs, player);
    const windingUp = this.projectiles.some((projectile) => telegraphPhase(projectile.startedAt, timeMs, DRONE_STAMP_TIMING) === "windup");
    this.cue.setVisible(windingUp);
    if (windingUp && Math.floor(timeMs / 100) % 2 === 0) this.sprite.setTint(this.color(PALETTE.classNetRed));
    else this.sprite.clearTint();
    const hover = Math.sin(timeMs / 180) * 1.2;
    this.syncRender(timeMs, 0, hover);
    return triggered;
  }

  status(_timeMs: number) {
    const phase = this.projectiles[0] ? telegraphPhase(this.projectiles[0].startedAt, this.combatTime, DRONE_STAMP_TIMING) : "idle";
    return phase === "windup" ? "stamp warning: leave the marked floor" : phase === "active" ? "black-bar stamp active" : "patrolling";
  }

  get stampReadout() {
    return this.projectiles.map((projectile) => ({ x: projectile.rect.x, y: projectile.rect.y,
      width: projectile.bounds.width, height: projectile.bounds.height,
      phase: telegraphPhase(projectile.startedAt, this.combatTime, DRONE_STAMP_TIMING),
      spent: projectile.spent }));
  }

  get telegraph() {
    const stamp = this.projectiles[0];
    if (!stamp) return null;
    const phase = telegraphPhase(stamp.startedAt, this.combatTime, DRONE_STAMP_TIMING);
    const end = DRONE_STAMP_TIMING.windupMs + (phase === "windup" ? 0 : DRONE_STAMP_TIMING.activeMs)
      + (phase === "recovery" ? DRONE_STAMP_TIMING.recoveryMs : 0);
    return { kind: `stamp-${phase}`, label: phase === "windup" ? "Leave the marked floor" : "Black-bar stamp",
      msRemaining: Math.max(0, Math.ceil(end - (this.combatTime - stamp.startedAt))),
      target: { x: stamp.rect.x, y: stamp.rect.y }, destination: null };
  }

  private canSee(player: Position) {
    const sight = new Phaser.Geom.Line(this.currentX, this.currentY, player.x, player.y);
    return !this.getSolids().some((solid) => Phaser.Geom.Intersects.LineToRectangle(sight, solid));
  }

  protected onDeath() {
    for (const projectile of this.projectiles.splice(0)) projectile.rect.destroy();
    super.onDeath();
  }

  private updateFacing() {
    if (Math.abs(this.velocityX) > Math.abs(this.velocityY)) {
      this.facing = this.velocityX < 0 ? "left" : "right";
      return;
    }
    if (Math.abs(this.velocityY) > 0.1) this.facing = this.velocityY < 0 ? "up" : "down";
  }

  private playWalk(direction: "down" | "up" | "left" | "right") {
    const animDirection = direction === "right" ? "walk-right" : `walk-${direction}`;
    const key = danneAnimKey(DRONE_ASSET.key, animDirection);
    if (this.scene.anims.exists(key) && this.sprite.anims.currentAnim?.key !== key) this.sprite.play(key);
    this.sprite.setFlipX(direction === "right");
  }

  private dropBlackBar(timeMs: number, player: Position) {
    this.nextStampAt = timeMs + 1700;
    const x = Math.round(player.x);
    const y = Math.round(player.y + 1);
    const rect = this.scene.add
      .rectangle(x, y, 30, 8, this.color(PALETTE.goldStamp), 0.08)
      .setStrokeStyle(1, this.color(PALETTE.goldStamp))
      .setDepth(y - 2).setName("nara-stamp-target");
    this.projectiles.push({
      rect,
      bounds: new Phaser.Geom.Rectangle(x - 15, y - 4, 30, 8),
      startedAt: timeMs,
      spent: false
    });
  }

  private updateProjectiles(timeMs: number, player: Player) {
    const footBox = new Phaser.Geom.Rectangle(player.position.x - 8, player.position.y - 3, 16, 8);
    this.projectiles = this.projectiles.filter((projectile) => {
      const phase = telegraphPhase(projectile.startedAt, timeMs, DRONE_STAMP_TIMING);
      const active = phase === "active";
      projectile.rect.setFillStyle(this.color(active ? PALETTE.black : PALETTE.goldStamp), active ? 0.95 : 0.08)
        .setStrokeStyle(1, this.color(active ? PALETTE.classNetRed : PALETTE.goldStamp))
        .setAlpha(phase === "recovery" ? 0.3 : 1);
      if (!projectile.spent && active && Phaser.Geom.Intersects.RectangleToRectangle(projectile.bounds, footBox)) {
        projectile.spent = true;
        player.takeHit(this.position, 8, 800);
      }
      if (phase === "idle") {
        projectile.rect.destroy();
        return false;
      }
      return true;
    });
  }
}
