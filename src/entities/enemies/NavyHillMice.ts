import Phaser from "phaser";
import { PALETTE } from "../../game/constants";
import { unlockCodexEntry } from "../../game/codex";
import type { Position } from "../../game/types";
import { snapPixel } from "../../systems/pixelPerfect";
import { Enemy } from "./Enemy";

export class NavyHillMice extends Enemy {
  private nextScatterAt = 0;
  private scatteringUntil = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    unlockCodexEntry("enemy-navy-hill-mice");
    super(scene, x, y, {
      label: "Navy Hill mice",
      spriteKey: "snes-navy-hill-mice",
      fallbackTextureKey: "source-note",
      waypoints: [
        { x: 39, y: 132 },
        { x: 64, y: 124 },
        { x: 82, y: 143 },
        { x: 68, y: 160 },
        { x: 41, y: 156 },
        { x: 30, y: 141 }
      ],
      tag: { text: "MICE", y: 15, color: PALETTE.black, backgroundColor: PALETTE.creamPaper },
      cue: { text: "SCATTER", y: -20, color: PALETTE.creamPaper, backgroundColor: PALETTE.deepRuby },
      shadow: { y: 12, width: 18, height: 5 },
      speed: 26,
      acceleration: 88,
      waypointTolerance: 3
    });
  }

  update(timeMs: number, deltaMs: number, player: Position, canScatter: boolean) {
    this.scurry(deltaMs);
    const distance = this.distanceTo(player);
    const triggered = canScatter && distance <= 23 && timeMs >= this.nextScatterAt;
    if (triggered) {
      this.nextScatterAt = timeMs + 3600;
      this.scatteringUntil = timeMs + 950;
      this.scene.tweens.add({
        targets: this.container,
        x: snapPixel(this.currentX - 3),
        duration: 40,
        yoyo: true,
        repeat: 5,
        ease: "Stepped"
      });
    }

    const active = timeMs < this.scatteringUntil;
    this.cue.setVisible(active);
    if (active && Math.floor(timeMs / 90) % 2 === 0) this.sprite.setTint(this.color(PALETTE.creamPaper));
    else if (active) this.sprite.setTint(this.color(PALETTE.goldStamp));
    else this.sprite.clearTint();

    const wiggleX = Math.sin(timeMs / 110) * 0.7;
    const wiggleY = Math.cos(timeMs / 145) * 0.5;
    this.syncRender(timeMs, wiggleX, wiggleY);
    return triggered;
  }

  status(timeMs: number) {
    return timeMs < this.scatteringUntil ? "scattering source notes" : "scurrying";
  }

  private scurry(deltaMs: number) {
    this.moveTowardWaypoint(deltaMs);
  }
}
