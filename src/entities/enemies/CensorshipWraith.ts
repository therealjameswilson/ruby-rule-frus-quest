import Phaser from "phaser";
import { danneAnimKey } from "../../art/danne_anims";
import { PALETTE } from "../../game/constants";
import { DANNE_RUNTIME_SPRITE_ASSETS } from "../../game/danneAtlas";
import { unlockCodexEntry } from "../../game/codex";
import type { Position } from "../../game/types";
import { Player } from "../Player";
import { Enemy } from "./Enemy";

const WRAITH_ASSET = DANNE_RUNTIME_SPRITE_ASSETS.find((asset) => asset.entityId === "censorship-wraith")!;

export class CensorshipWraith extends Enemy {
  private nextSwipeAt = 0;
  private swipingUntil = 0;
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
    this.moveTowardWaypoint(deltaMs);
    this.updateFacing();
    this.playWalk(this.facing);
    const triggered = canAttack && this.distanceTo(player.position) <= 34 && timeMs >= this.nextSwipeAt;
    if (triggered) this.startSwipe(timeMs, player);
    const active = timeMs < this.swipingUntil;
    this.cue.setVisible(active);
    this.swipeArc?.setVisible(active);
    if (active && Math.floor(timeMs / 90) % 2 === 0) this.sprite.setTint(this.color(PALETTE.classNetRed));
    else this.sprite.clearTint();
    const drift = Math.sin(timeMs / 250) * 0.7;
    this.syncRender(timeMs, 0, drift);
    this.syncSwipeArc();
    return triggered;
  }

  status(timeMs: number) {
    return timeMs < this.swipingUntil ? "paint-roller swipe" : "floating";
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

  private startSwipe(timeMs: number, player: Player) {
    this.nextSwipeAt = timeMs + 2300;
    this.swipingUntil = timeMs + 650;
    const hitbox = this.swipeHitbox();
    const footBox = new Phaser.Geom.Rectangle(player.position.x - 8, player.position.y - 3, 16, 8);
    if (Phaser.Geom.Intersects.RectangleToRectangle(hitbox, footBox)) {
      player.takeHit(this.position, 10, 850);
    }
    if (!this.swipeArc) {
      this.swipeArc = this.scene.add.arc(this.currentX, this.currentY, 19, 210, 330, false, this.color(PALETTE.classNetRed), 0.35)
        .setStrokeStyle(2, this.color(PALETTE.creamPaper))
        .setDepth(this.currentY + 2)
        .setVisible(false);
    }
    this.playAttack();
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
