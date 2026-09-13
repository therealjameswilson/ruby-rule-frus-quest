import Phaser from "phaser";
import { danneAnimKey } from "../../art/danne_anims";
import { PALETTE } from "../../game/constants";
import { DANNE_RUNTIME_SPRITE_ASSETS } from "../../game/danneAtlas";
import { unlockCodexEntry } from "../../game/codex";
import { CENSORSHIP_WRAITH_SWIPE_TRIGGER_RADIUS } from "../../game/levelPacing";
import type { Position } from "../../game/types";
import {
  isTelegraphActive,
  isTelegraphVisible,
  telegraphDurationMs,
  telegraphPhase,
  type TelegraphTiming
} from "../../systems/enemyCombat";
import { Player } from "../Player";
import { Enemy } from "./Enemy";
import { frameDeltaSeconds } from "../../systems/smoothMovement";

const WRAITH_ASSET = DANNE_RUNTIME_SPRITE_ASSETS.find((asset) => asset.entityId === "censorship-wraith")!;

// Windup is the floor warning (no damage). Damage only lands during the
// short active window, then a recovery the player can punish. At 58 px/s the
// warning allows a sideways dodge clear of both the sweep and the player's feet.
export const WRAITH_SWIPE_TIMING: TelegraphTiming = { windupMs: 550, activeMs: 170, recoveryMs: 300 };

export class CensorshipWraith extends Enemy {
  private combatTime = 0;
  private nextSwipeAt = 0;
  private swipeStartedAt: number | null = null;
  private swipeDamageDone = false;
  private swipeZone?: Phaser.GameObjects.Rectangle;
  private facing: "down" | "up" | "left" | "right" = "down";

  constructor(scene: Phaser.Scene, x: number, y: number, waypoints: Position[]) {
    unlockCodexEntry("enemy-censorship-wraith");
    super(scene, x, y, {
      label: "Censorship Wraith",
      spriteKey: WRAITH_ASSET.key,
      fallbackTextureKey: "bureaucratic-wall",
      waypoints,
      tag: { text: "", y: 20, color: PALETTE.creamPaper, backgroundColor: PALETTE.black },
      cue: { text: "!", y: -28, color: PALETTE.goldStamp, backgroundColor: PALETTE.black },
      shadow: { y: 16, width: 22, height: 7 },
      speed: 15,
      acceleration: 54,
      waypointTolerance: 4,
      health: 3
    });
    this.sprite.setOrigin(0.5, 0.88).setScale(0.16);
    this.playWalk("down");
  }

  update(sceneTime: number, deltaMs: number, player: Player, canAct: boolean) {
    this.setCombatActive(canAct, sceneTime);
    if (!canAct || this.dead) return false;
    this.combatTime += frameDeltaSeconds(deltaMs) * 1000;
    const timeMs = this.combatTime;
    const swinging = isTelegraphVisible(this.swipeStartedAt, timeMs, WRAITH_SWIPE_TIMING);
    // Hold position through the swing so the tell reads clearly (ALTTP enemies
    // plant themselves to attack rather than sliding into you mid-swipe).
    if (!swinging) this.moveTowardWaypoint(deltaMs);
    this.updateFacing();
    if (!swinging) this.playWalk(this.facing);
    const triggered = this.swipeStartedAt === null && this.distanceTo(player.position) <= CENSORSHIP_WRAITH_SWIPE_TRIGGER_RADIUS && timeMs >= this.nextSwipeAt;
    if (triggered) this.startSwipe(timeMs);
    this.resolveSwipe(timeMs, player);

    const phase = telegraphPhase(this.swipeStartedAt, timeMs, WRAITH_SWIPE_TIMING);
    const visible = phase !== "idle";
    this.cue.setVisible(phase === "windup");
    this.swipeZone?.setVisible(visible)
      .setFillStyle(this.color(phase === "active" ? PALETTE.classNetRed : PALETTE.goldStamp), phase === "active" ? 0.6 : 0.15)
      .setStrokeStyle(1, this.color(phase === "recovery" ? PALETTE.stoneGray : PALETTE.goldStamp))
      .setAlpha(phase === "recovery" ? 0.35 : 1);
    // Warn in gold during the windup tell, flash red on the damaging frames.
    if (phase === "windup") this.sprite.setTint(this.color(PALETTE.goldStamp));
    else if ((phase === "active" || phase === "recovery") && Math.floor(timeMs / 90) % 2 === 0) this.sprite.setTint(this.color(PALETTE.classNetRed));
    else this.sprite.clearTint();
    const drift = Math.sin(timeMs / 250) * 0.7;
    this.syncRender(timeMs, 0, drift);
    this.syncSwipeZone();
    return triggered;
  }

  status(_timeMs: number) {
    const phase = telegraphPhase(this.swipeStartedAt, this.combatTime, WRAITH_SWIPE_TIMING);
    if (phase === "windup") return "winding up ink sweep";
    if (phase === "active" || phase === "recovery") return "paint-roller swipe";
    return "floating";
  }

  get telegraph() {
    const phase = telegraphPhase(this.swipeStartedAt, this.combatTime, WRAITH_SWIPE_TIMING);
    if (this.dead || phase === "idle" || this.swipeStartedAt === null) return null;
    const timing = WRAITH_SWIPE_TIMING;
    const phaseEnd = phase === "windup" ? timing.windupMs
      : phase === "active" ? timing.windupMs + timing.activeMs : telegraphDurationMs(timing);
    const bounds = this.swipeHitbox();
    return {
      kind: `ink-sweep-${phase}`, label: phase === "windup" ? "INK SWEEP" : phase === "active" ? "SWEEP" : "RECOVER",
      msRemaining: Math.max(0, Math.round(this.swipeStartedAt + phaseEnd - this.combatTime)),
      target: { x: Math.round(bounds.centerX), y: Math.round(bounds.centerY) }, destination: null
    };
  }

  destroy() {
    this.swipeZone?.destroy();
    this.swipeZone = undefined;
    super.destroy();
  }

  protected onDeath() {
    this.swipeZone?.destroy();
    this.swipeZone = undefined;
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
    const key = danneAnimKey(WRAITH_ASSET.key, animDirection);
    if (this.scene.anims.exists(key) && this.sprite.anims.currentAnim?.key !== key) this.sprite.play(key);
    this.sprite.setFlipX(direction === "right");
  }

  private startSwipe(timeMs: number) {
    this.nextSwipeAt = timeMs + 2300;
    this.swipeStartedAt = timeMs;
    this.swipeDamageDone = false;
    if (!this.swipeZone) {
      this.swipeZone = this.scene.add.rectangle(0, 0, 1, 1).setDepth(6).setVisible(false);
    }
    this.playAttack();
  }

  private resolveSwipe(timeMs: number, player: Player) {
    if (this.swipeStartedAt === null) return;
    if (!this.swipeDamageDone && isTelegraphActive(this.swipeStartedAt, timeMs, WRAITH_SWIPE_TIMING)) {
      const hitbox = this.swipeHitbox();
      const footBox = new Phaser.Geom.Rectangle(player.position.x - 8, player.position.y - 3, 16, 8);
      if (Phaser.Geom.Intersects.RectangleToRectangle(hitbox, footBox)) {
        player.takeHit(this.position, 10, 850);
        this.swipeDamageDone = true;
      }
    }
    if (timeMs - this.swipeStartedAt >= telegraphDurationMs(WRAITH_SWIPE_TIMING)) this.swipeStartedAt = null;
  }

  private swipeHitbox() {
    if (this.facing === "left") return new Phaser.Geom.Rectangle(this.currentX - 28, this.currentY - 17, 28, 30);
    if (this.facing === "right") return new Phaser.Geom.Rectangle(this.currentX, this.currentY - 17, 28, 30);
    if (this.facing === "up") return new Phaser.Geom.Rectangle(this.currentX - 18, this.currentY - 34, 36, 28);
    return new Phaser.Geom.Rectangle(this.currentX - 18, this.currentY - 6, 36, 28);
  }

  private playAttack() {
    const key = danneAnimKey(WRAITH_ASSET.key, "attack");
    if (this.scene.anims.exists(key)) this.sprite.play(key);
  }

  private syncSwipeZone() {
    const bounds = this.swipeHitbox();
    this.swipeZone?.setPosition(Math.round(bounds.centerX), Math.round(bounds.centerY)).setSize(bounds.width, bounds.height);
  }
}
