import type Phaser from 'phaser';
import { prefersReducedMotion } from './motionPreferences';

/** Quiet motion behind the world props, bounded to the painted river and gardens. */
export class OutdoorAtmosphere {
  private readonly art: Phaser.GameObjects.Graphics;
  private elapsed = 0;
  constructor(scene: Phaser.Scene) {
    this.art = scene.add.graphics().setName('outdoor-atmosphere').setDepth(-19);
    this.draw();
  }
  update(delta: number) {
    if (prefersReducedMotion()) return;
    this.elapsed += Math.max(0, Math.min(50, delta));
    this.draw();
  }
  private draw() {
    const t = this.elapsed / 1000;
    this.art.clear();
    // Two banks; leave the stone bridge at the center completely clear.
    for (const bank of [0, 1]) for (let i = 0; i < 6; i++) {
      const phase = t * .75 + i * 1.7 + bank;
      const x = 9 + bank * 145 + i * 17 + Math.sin(phase) * 2;
      const y = 216 + (i % 3) * 5;
      const alpha = .12 + (Math.sin(phase) + 1) * .13;
      this.art.lineStyle(.6, 0xe5ffff, alpha);
      this.art.beginPath(); this.art.moveTo(x, y); this.art.lineTo(x + 3 + (i % 3), y); this.art.strokePath();
    }
    // Sparse drifting petals near the garden edges, away from the main paths.
    for (let i = 0; i < 6; i++) {
      const side = i % 2;
      const progress = (t * 2.6 + i * 23) % 115;
      const x = (side ? 226 : 24) + Math.sin(t * .65 + i * 2) * 7;
      const y = 68 + progress;
      this.art.fillStyle(i % 3 ? 0xffd1e0 : 0xffebed, .55);
      this.art.fillEllipse(x, y, 1.8, .9 + Math.abs(Math.sin(t + i)) * .8);
    }
  }
}
