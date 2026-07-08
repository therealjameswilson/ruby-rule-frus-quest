import Phaser from "phaser";
import { danneAnimKey } from "../../art/danne_anims";
import { PALETTE } from "../../game/constants";
import { DANNE_RUNTIME_SPRITE_ASSETS } from "../../game/danneAtlas";
import { unlockCodexEntry } from "../../game/codex";
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

const WRAITH_ASSET = DANNE_RUNTIME_SPRITE_ASSETS.find((asset) => asset.entityId === "censorship-wraith")!;

// Windup is the tell (arc/cue flash, no damage). Damage only lands during the
// short active window, then a recovery the player can punish. ~650ms total.
const SWIPE_TIMING: TelegraphTiming = { windupMs: 240, activeMs: 170, recoveryMs: 240 };

export class CensorshipWraith extends Enemy {
  private nextSwipeAt = 0;
  private swipeStartedAt: number | null = null;
  private swipeDamageDone = false;
  private swipeArc?: Phaser.GameObjects.Arc;
  private facing: "down" | "up" | "left" | "right" = "down";

  constructor(scene: Phaser.Scene, x: number, y: number, waypoints: Position[]) {
    unlockCodexEntry("enemy-censorship-wraith");
    super(scene, x, y, {
      label: "Censorship Wraith",
      spriteKey: WRAITH_ASSET.key,
      fallbackTextureKey: "bureaucratic-wall",
      waypoints,
      tag: { text: "WRAITH", y: 20, color: PALETTE.creamPaper, backgroundColor: PALETTE.black },
      cue: { text: "INK SWEEP", y: -28, color: PALETTE.creamPaper, backgroundColor: PALETTE.classNetRed },
      shadow: { y: 16, width: 22, height: 7 },
      speed: 15,
      acceleration: 54,
      waypointTolerance: 4,
      health: 3
    });
    this.sprite.setOrigin(0.5, 0.88).setScale(0.16);
    this.playWalk("down");
  }

  update(timeMs: number, deltaMs: number, player: Player, canAttack: boolean) {
    const swinging = isTelegraphVisible(this.swipeStartedAt, timeMs, SWIPE_TIMING);
    // Hold position through the swing so the tell reads clearly (ALTTP enemies
    // plant themselves to attack rather than sliding into you mid-swipe).
    if (!swinging) this.moveTowardWaypoint(deltaMs);
    this.updateFacing();
    if (!swinging) this.playWalk(this.facing);
    const triggered = canAttack && this.swipeStartedAt === null && this.distanceTo(player.position) <= 34 && timeMs >= this.nextSwipeAt;
    if (triggered) this.startSwipe(timeMs);
    this.resolveSwipe(timeMs, player);

    const phase = telegraphPhase(this.swipeStartedAt, timeMs, SWIPE_TIMING);
    const visible = phase !== "idle";
    this.cue.setVisible(visible);
    this.swipeArc?.setVisible(visible);
    // Warn in gold during the windup tell, flash red on the damaging frames.
    if (phase === "windup") this.sprite.setTint(this.color(PALETTE.goldStamp));
    else if ((phase === "active" || phase === "recovery") && Math.floor(timeMs / 90) % 2 === 0) this.sprite.setTint(this.color(PALETTE.classNetRed));
    else this.sprite.clearTint();
    const drift = Math.sin(timeMs / 250) * 0.7;
    this.syncRender(timeMs, 0, drift);
    this.syncSwipeArc();
    return triggered;
  }

  status(timeMs: number) {
    const phase = telegraphPhase(this.swipeStartedAt, timeMs, SWIPE_TIMING);
    if (phase === "windup") return "winding up ink sweep";
    if (phase === "active" || phase === "recovery") return "paint-roller swipe";
    return "floating";
  }

  protected onDeath() {
    this.swipeArc?.destroy();
    this.swipeArc = undefined;
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
    if (!this.swipeArc) {
      this.swipeArc = this.scene.add.arc(this.currentX, this.currentY, 19, 210, 330, false, this.color(PALETTE.classNetRed), 0.35)
        .setStrokeStyle(2, this.color(PALETTE.creamPaper))
        .setDepth(this.currentY + 2)
        .setVisible(false);
    }
    this.playAttack();
  }

  private resolveSwipe(timeMs: number, player: Player) {
    if (this.swipeStartedAt === null) return;
    if (!this.swipeDamageDone && isTelegraphActive(this.swipeStartedAt, timeMs, SWIPE_TIMING)) {
      const hitbox = this.swipeHitbox();
      const footBox = new Phaser.Geom.Rectangle(player.position.x - 8, player.position.y - 3, 16, 8);
      if (Phaser.Geom.Intersects.RectangleToRectangle(hitbox, footBox)) {
        player.takeHit(this.position, 10, 850);
        this.swipeDamageDone = true;
      }
    }
    if (timeMs - this.swipeStartedAt >= telegraphDurationMs(SWIPE_TIMING)) this.swipeStartedAt = null;
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

  private syncSwipeArc() {
    if (!this.swipeArc) return;
    this.swipeArc.setPosition(Math.round(this.currentX), Math.round(this.currentY - 8));
    this.swipeArc.setDepth(Math.round(this.currentY + 3));
    if (this.facing === "left") this.swipeArc.setAngle(180);
    else if (this.facing === "up") this.swipeArc.setAngle(270);
    else if (this.facing === "down") this.swipeArc.setAngle(90);
    else this.swipeArc.setAngle(0);
  }
}
