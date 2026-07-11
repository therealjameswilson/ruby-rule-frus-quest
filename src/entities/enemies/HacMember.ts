import Phaser from "phaser";
import { PALETTE } from "../../game/constants";
import { unlockCodexEntry } from "../../game/codex";
import type { Position } from "../../game/types";
import { snapPixel } from "../../systems/pixelPerfect";
import { Enemy } from "./Enemy";

export class HacMember extends Enemy {
  private nextDistractionAt = 0;
  private distractingUntil = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    unlockCodexEntry("enemy-hac-member");
    super(scene, x, y, {
      label: "HAC member",
      spriteKey: "snes-hac-member",
      fallbackTextureKey: "marcus",
      waypoints: [
        { x: 88, y: 174 },
        { x: 176, y: 174 },
        { x: 214, y: 132 },
        { x: 176, y: 88 },
        { x: 82, y: 88 },
        { x: 42, y: 134 }
      ],
      tag: { text: "HAC", y: 17, color: PALETTE.goldStamp, backgroundColor: PALETTE.black },
      cue: { text: "DISTRACT", y: -22, color: PALETTE.classNetRed, backgroundColor: PALETTE.black },
      speed: 24,
      acceleration: 80,
      waypointTolerance: 3
    });
  }

  update(timeMs: number, deltaMs: number, player: Position, canDistract: boolean) {
    this.walk(deltaMs);
    const distance = Phaser.Math.Distance.Between(this.currentX, this.currentY, player.x, player.y);
    const triggered = canDistract && distance <= 25 && timeMs >= this.nextDistractionAt;
    if (triggered) {
      this.nextDistractionAt = timeMs + 3400;
      this.distractingUntil = timeMs + 1050;
      this.scene.tweens.add({
        targets: this.container,
        x: snapPixel(this.currentX + 2),
        duration: 45,
        yoyo: true,
        repeat: 3,
        ease: "Stepped"
      });
    }
    this.cue.setVisible(timeMs < this.distractingUntil);
    if (timeMs < this.distractingUntil) this.sprite.setTint(this.color(PALETTE.classNetRed));
    else this.sprite.clearTint();
    const bob = Math.sin(timeMs / 230) * 0.8;
    this.syncRender(timeMs, 0, bob);
    return triggered;
  }

  status(timeMs: number) {
    return timeMs < this.distractingUntil ? "distracting" : "roaming";
  }

  private walk(deltaMs: number) {
    this.moveTowardWaypoint(deltaMs);
  }
}
