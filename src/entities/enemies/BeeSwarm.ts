import Phaser from "phaser";
import { PALETTE } from "../../game/constants";
import type { Position } from "../../game/types";
import { snapPixel } from "../../systems/pixelPerfect";
import { Enemy } from "./Enemy";

export class BeeSwarm extends Enemy {
  private nextBuzzAt = 0;
  private buzzingUntil = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, {
      label: "Bees",
      spriteKey: "snes-frus-bees",
      fallbackTextureKey: "source-note",
      waypoints: [
        { x: 162, y: 166 },
        { x: 116, y: 142 },
        { x: 74, y: 164 },
        { x: 111, y: 190 },
        { x: 172, y: 192 },
        { x: 216, y: 158 },
        { x: 188, y: 120 },
        { x: 134, y: 116 }
      ],
      tag: { text: "BEES", y: 15, color: PALETTE.black, backgroundColor: PALETTE.goldStamp },
      cue: { text: "BUZZ", y: -20, color: PALETTE.goldStamp, backgroundColor: PALETTE.black },
      shadow: { y: 12, width: 18, height: 5 },
      speed: 30,
      acceleration: 95,
      waypointTolerance: 4
    });
  }

  update(timeMs: number, deltaMs: number, player: Position, canBuzz: boolean) {
    this.fly(deltaMs, timeMs);
    const distance = this.distanceTo(player);
    const triggered = canBuzz && distance <= 24 && timeMs >= this.nextBuzzAt;
    if (triggered) {
      this.nextBuzzAt = timeMs + 3000;
      this.buzzingUntil = timeMs + 900;
      this.scene.tweens.add({
        targets: this.container,
        x: snapPixel(this.currentX + 3),
        duration: 35,
        yoyo: true,
        repeat: 5,
        ease: "Stepped"
      });
    }

    const active = timeMs < this.buzzingUntil;
    this.cue.setVisible(active);
    if (active && Math.floor(timeMs / 80) % 2 === 0) this.sprite.setTint(this.color(PALETTE.goldStamp));
    else if (active) this.sprite.setTint(this.color(PALETTE.terminalCyan));
    else this.sprite.clearTint();

    const jitterX = Math.sin(timeMs / 95) * 1.1;
    const jitterY = Math.cos(timeMs / 120) * 0.9;
    this.syncRender(timeMs, jitterX, jitterY);
    return triggered;
  }

  status(timeMs: number) {
    return timeMs < this.buzzingUntil ? "buzzing" : "swarming";
  }

  private fly(deltaMs: number, timeMs: number) {
    this.moveTowardWaypoint(deltaMs);
  }
}
