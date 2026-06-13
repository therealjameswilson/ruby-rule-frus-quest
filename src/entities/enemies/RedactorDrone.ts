import Phaser from "phaser";
import { danneAnimKey } from "../../art/danne_anims";
import { PALETTE } from "../../game/constants";
import { DANNE_RUNTIME_SPRITE_ASSETS } from "../../game/danneAtlas";
import type { Position } from "../../game/types";
import { Player } from "../Player";
import { Enemy } from "./Enemy";

const DRONE_ASSET = DANNE_RUNTIME_SPRITE_ASSETS.find((asset) => asset.entityId === "redactor-drone")!;

interface BlackBarProjectile {
  rect: Phaser.GameObjects.Rectangle;
  bounds: Phaser.Geom.Rectangle;
  expiresAt: number;
  armed: boolean;
}

export class RedactorDrone extends Enemy {
  private nextStampAt = 0;
  private stampingUntil = 0;
  private projectiles: BlackBarProjectile[] = [];
  private facing: "down" | "up" | "left" | "right" = "down";

  constructor(scene: Phaser.Scene, x: number, y: number, waypoints: Position[]) {
    super(scene, x, y, {
      label: "Redactor Drone",
      spriteKey: DRONE_ASSET.key,
      fallbackTextureKey: "bureaucratic-wall",
      waypoints,
      tag: { text: "DRONE", y: 17, color: PALETTE.classNetRed, backgroundColor: PALETTE.black },
      cue: { text: "STAMP", y: -22, color: PALETTE.classNetRed, backgroundColor: PALETTE.black },
      shadow: { y: 12, width: 20, height: 6 },
      speed: 22,
      acceleration: 90,
      waypointTolerance: 3,
      health: 2
    });
    this.sprite.setOrigin(0.5, 0.82).setScale(0.18);
    this.playWalk("down");
  }

  update(timeMs: number, deltaMs: number, player: Player, canAttack: boolean) {
    this.moveTowardWaypoint(deltaMs);
    this.updateFacing();
    this.playWalk(this.facing);
    const triggered = canAttack && this.distanceTo(player.position) <= 44 && timeMs >= this.nextStampAt;
    if (triggered) this.dropBlackBar(timeMs, player.position);
    this.updateProjectiles(timeMs, player);
    const active = timeMs < this.stampingUntil;
    this.cue.setVisible(active);
    if (active && Math.floor(timeMs / 100) % 2 === 0) this.sprite.setTint(this.color(PALETTE.classNetRed));
    else this.sprite.clearTint();
    const hover = Math.sin(timeMs / 180) * 1.2;
    this.syncRender(timeMs, 0, hover);
    return triggered;
  }

  status(timeMs: number) {
    return timeMs < this.stampingUntil ? "dropping black-bar stamp" : "patrolling";
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
    this.stampingUntil = timeMs + 520;
    const x = Math.round(player.x);
    const y = Math.round(player.y - 8);
    const rect = this.scene.add
      .rectangle(x, y, 30, 7, this.color(PALETTE.black), 0.88)
      .setStrokeStyle(1, this.color(PALETTE.classNetRed))
      .setDepth(y + 8);
    this.projectiles.push({
      rect,
      bounds: new Phaser.Geom.Rectangle(x - 15, y - 4, 30, 8),
      expiresAt: timeMs + 1000,
      armed: true
    });
    this.scene.tweens.add({
      targets: rect,
      alpha: 0.35,
      duration: 120,
      yoyo: true,
      repeat: 3,
      ease: "Stepped"
    });
  }

  private updateProjectiles(timeMs: number, player: Player) {
    const footBox = new Phaser.Geom.Rectangle(player.position.x - 8, player.position.y - 3, 16, 8);
    this.projectiles = this.projectiles.filter((projectile) => {
      if (projectile.armed && Phaser.Geom.Intersects.RectangleToRectangle(projectile.bounds, footBox)) {
        projectile.armed = false;
        player.takeHit(this.position, 8, 800);
      }
      if (timeMs >= projectile.expiresAt) {
        projectile.rect.destroy();
        return false;
      }
      return true;
    });
  }
}
