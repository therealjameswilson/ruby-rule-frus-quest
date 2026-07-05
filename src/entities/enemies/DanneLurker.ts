import Phaser from "phaser";
import { danneAnimKey } from "../../art/danne_anims";
import { PALETTE } from "../../game/constants";
import { unlockCodexEntry } from "../../game/codex";
import { DANNE_BOSS_SPRITE_ASSET } from "../../game/danneAtlas";
import type { Position } from "../../game/types";
import { snapPixel } from "../../systems/pixelPerfect";
import { Enemy } from "./Enemy";

interface DanneLurkerOptions {
  waypoints: Position[];
  label?: string;
}

export class DanneLurker extends Enemy {
  private nextPressureAt = 0;
  private pressureUntil = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, options: DanneLurkerOptions) {
    unlockCodexEntry("enemy-danne-boss");
    super(scene, x, y, {
      label: options.label ?? "DANN-E",
      spriteKey: DANNE_BOSS_SPRITE_ASSET.key,
      fallbackTextureKey: "snes-wall-danne-queue",
      waypoints: options.waypoints,
      tag: { text: "DANN-E", y: 17, color: PALETTE.goldStamp, backgroundColor: PALETTE.black },
      cue: { text: "30YR", y: -24, color: PALETTE.classNetRed, backgroundColor: PALETTE.black },
      shadow: { y: 13, width: 21, height: 6 },
      speed: 16,
      acceleration: 58,
      waypointTolerance: 4
    });
    this.sprite.setOrigin(0.5, 0.82).setScale(0.055);
    const animKey = danneAnimKey(DANNE_BOSS_SPRITE_ASSET.key, "walk-down");
    if (scene.anims.exists(animKey)) this.sprite.play(animKey);
  }

  update(timeMs: number, deltaMs: number, player: Position, canPressure: boolean) {
    this.moveTowardWaypoint(deltaMs);
    const distance = this.distanceTo(player);
    const triggered = canPressure && distance <= 25 && timeMs >= this.nextPressureAt;
    if (triggered) {
      this.nextPressureAt = timeMs + 5600;
      this.pressureUntil = timeMs + 1150;
      this.scene.tweens.add({
        targets: this.container,
        x: snapPixel(this.currentX + 3),
        duration: 45,
        yoyo: true,
        repeat: 5,
        ease: "Stepped"
      });
    }

    const active = timeMs < this.pressureUntil;
    this.cue.setVisible(active);
    if (active && Math.floor(timeMs / 105) % 2 === 0) this.sprite.setTint(this.color(PALETTE.classNetRed));
    else if (active) this.sprite.setTint(this.color(PALETTE.goldStamp));
    else this.sprite.clearTint();

    const hoverX = Math.sin(timeMs / 260) * 0.7;
    const hoverY = Math.cos(timeMs / 310) * 0.55;
    this.syncRender(timeMs, hoverX, hoverY);
    return { triggered, pressureActive: active };
  }

  status(timeMs: number) {
    return timeMs < this.pressureUntil ? "deadline pressure" : "lurking";
  }

  readout(timeMs: number) {
    return {
      label: "DANN-E LURKER",
      x: this.position.x,
      y: this.position.y,
      spriteKey: this.spriteKey,
      behavior: "lurks near workflow paths and pressures deadline shortcuts",
      defeatMethod: "Keep moving through human review; final defeat happens at the Buckram Gate.",
      status: this.status(timeMs)
    };
  }
}
