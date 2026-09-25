import type Phaser from 'phaser';
import { prefersReducedMotion } from './motionPreferences';

/** A single original tapered streak; no particle allocation or collision body. */
export function bossBoltTrail(scene: Phaser.Scene) {
  const streak = scene.add.triangle(0, 0, 0, 3, 18, 0, 18, 6, 0xe2ac57, 0.7)
    .setOrigin(1, 0.5).setStrokeStyle(0.5, 0x171e28, 0.85)
    .setName('boss-ego-direction-tail').setVisible(!prefersReducedMotion());
  return {
    update(x: number, y: number, vx: number, vy: number) {
      streak.setPosition(x, y).setAngle(Math.atan2(vy, vx) * 180 / Math.PI).setDepth(Math.round(y + 5));
    },
    returned() { streak.setFillStyle(0x66d8df, 0.85).setStrokeStyle(0.5, 0xe8d8a8, 0.9); },
    destroy() { streak.destroy(); }
  };
}
