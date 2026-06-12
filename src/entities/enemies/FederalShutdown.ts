import Phaser from "phaser";
import { PALETTE } from "../../game/constants";
import type { Position } from "../../game/types";
import { snapPixel } from "../../systems/pixelPerfect";
import { Enemy } from "./Enemy";

export class FederalShutdown extends Enemy {
  private nextClosureAt = 0;
  private closureUntil = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, {
      label: "Federal government shutdown",
      spriteKey: "snes-federal-shutdown",
      fallbackTextureKey: "bureaucratic-wall",
      waypoints: [
        { x: 214, y: 176 },
        { x: 164, y: 184 },
        { x: 122, y: 168 },
        { x: 72, y: 180 },
        { x: 44, y: 142 },
        { x: 91, y: 122 },
        { x: 166, y: 126 },
        { x: 214, y: 150 }
      ],
      tag: { text: "STOP", y: 17, color: PALETTE.black, backgroundColor: PALETTE.goldStamp },
      cue: { text: "CLOSED", y: -23, color: PALETTE.goldStamp, backgroundColor: PALETTE.deepRuby },
      shadow: { y: 15, width: 20, height: 6 },
      speed: 18,
      acceleration: 60,
      waypointTolerance: 3
    });
  }

  update(timeMs: number, deltaMs: number, player: Position, canImpede: boolean) {
    this.walk(deltaMs);
    const distance = this.distanceTo(player);
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
    if (active && Math.floor(timeMs / 120) % 2 === 0) this.sprite.setTint(this.color(PALETTE.goldStamp));
    else if (active) this.sprite.setTint(this.color(PALETTE.classNetRed));
    else this.sprite.clearTint();

    const bob = Math.sin(timeMs / 280) * 0.65;
    this.syncRender(timeMs, 0, bob);
    return { triggered, stopWorkActive: active };
  }

  status(timeMs: number) {
    return timeMs < this.closureUntil ? "stop-work order" : "roaming";
  }

  private walk(deltaMs: number) {
    this.moveTowardWaypoint(deltaMs);
  }
}
