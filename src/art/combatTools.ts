import type Phaser from 'phaser';
import type { WeaponToolId } from '../systems/weaponState';

export const COMBAT_SWEEP_KEY = 'combat-sweep-detail';

export const COMBAT_TOOL_ART: Record<WeaponToolId, { key: string; size: number }> = {
  stapler: { key: 'combat-stapler-detail', size: 16 },
  citation_stamp: { key: 'combat-stamp-detail', size: 18 },
  red_pencil: { key: 'combat-pencil-detail', size: 20 },
  review_folder: { key: 'combat-folder-detail', size: 22 }
};

/** Small original object illustrations, with transparent padding for attack rotation. */
export function createCombatToolTextures(scene: Phaser.Scene) {
  if (!scene.textures.createCanvas) return;
  if (!scene.textures.exists(COMBAT_SWEEP_KEY)) {
    const texture = scene.textures.createCanvas(COMBAT_SWEEP_KEY, 96, 96);
    if (texture) {
      const c = texture.getContext(); c.scale(4, 4);
      const sweep = c.createLinearGradient(0, 10, 0, 23);
      sweep.addColorStop(0, 'rgba(231,191,119,0)');
      sweep.addColorStop(.65, 'rgba(245,211,149,.22)');
      sweep.addColorStop(1, 'rgba(255,241,195,.75)');
      c.fillStyle = sweep;
      c.beginPath(); c.arc(12, 11, 11, .08 * Math.PI, .92 * Math.PI);
      c.quadraticCurveTo(12, 24, 22.65, 13.74); c.closePath(); c.fill();
      c.lineWidth = .6; c.strokeStyle = 'rgba(255,242,206,.8)';
      c.beginPath(); c.arc(12, 11, 10.9, .15 * Math.PI, .85 * Math.PI); c.stroke();
      texture.refresh();
    }
  }
  for (const [id, art] of Object.entries(COMBAT_TOOL_ART)) {
    if (scene.textures.exists(art.key)) continue;
    const texture = scene.textures.createCanvas(art.key, 96, 96);
    if (!texture) continue;
    const c = texture.getContext(); c.scale(4, 4);
    const gradient = (top: string, bottom: string, start = 3, end = 21) => {
      const g = c.createLinearGradient(0, start, 0, end); g.addColorStop(0, top); g.addColorStop(1, bottom); return g;
    };
    const round = (x: number, y: number, w: number, h: number, r: number) => {
      c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r);
      c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r);
      c.arcTo(x, y, x + w, y, r); c.closePath(); c.fill();
    };
    c.lineWidth = .55; c.strokeStyle = '#26333b';
    if (id === 'stapler') {
      c.fillStyle = '#242b32'; round(2, 16, 20, 4, 1.6);
      c.fillStyle = gradient('#e0e3d9', '#77868c', 16, 20); round(3, 16, 18, 2.5, .8);
      c.fillStyle = '#606d73'; round(17, 8, 4, 9, 1);
      c.fillStyle = '#bcc6bd'; c.fillRect(17.5, 9, .8, 6);
      c.fillStyle = '#3d1828'; round(2, 6, 20, 6.5, 2); c.stroke();
      c.fillStyle = gradient('#db7179', '#842d44', 6, 12); round(3, 6.5, 18, 4.5, 1.5);
      c.fillStyle = 'rgba(255,231,212,.6)'; round(5, 7.2, 13, .6, .3);
      c.fillStyle = '#394650'; c.beginPath(); c.arc(19, 10.5, 1, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#d5c6a0'; c.fillRect(5, 15.9, 4, .7);
    } else if (id === 'citation_stamp') {
      c.fillStyle = '#263038'; round(3, 17, 18, 5, 1.2);
      c.fillStyle = gradient('#c18a58', '#724430', 15, 21); round(4, 15, 16, 5, 1);
      c.fillStyle = '#e0b776'; c.fillRect(5, 15.5, 14, .7);
      c.fillStyle = gradient('#d6b172', '#91633e'); round(10, 8, 4, 8, 1.3);
      c.fillStyle = gradient('#ce737b', '#6c243b', 2, 10); round(7, 2, 10, 8, 3); c.stroke();
      c.fillStyle = 'rgba(255,231,212,.5)'; round(9, 3, 5, .7, .3);
      c.fillStyle = '#302d33'; round(6, 18, 12, 2, .4);
      c.fillStyle = '#e1d9bb'; c.fillRect(8, 18.7, 8, .5);
    } else if (id === 'red_pencil') {
      c.save(); c.translate(12, 12); c.rotate(Math.PI / 5);
      c.fillStyle = '#422a32'; c.fillRect(-2.2, -9, 4.4, 16);
      c.fillStyle = '#b83a52'; c.fillRect(-1.7, -8.8, 3.4, 15.2);
      c.fillStyle = '#ee8584'; c.fillRect(-1.3, -8.5, .7, 14.7);
      c.fillStyle = '#e5c086'; c.beginPath(); c.moveTo(-2, 6); c.lineTo(2, 6); c.lineTo(0, 11); c.closePath(); c.fill();
      c.fillStyle = '#42333a'; c.beginPath(); c.moveTo(-.65, 9.3); c.lineTo(.65, 9.3); c.lineTo(0, 11); c.closePath(); c.fill();
      c.fillStyle = '#e6c77e'; c.fillRect(-2, -7.7, 4, .65); c.restore();
    } else {
      c.fillStyle = '#4f3829'; round(2, 5, 20, 17, 1.2);
      c.fillStyle = '#d6a967'; round(3, 3, 9, 5, 1);
      c.fillStyle = '#e9dfc1'; c.fillRect(4, 6, 16, 12);
      c.fillStyle = '#b7b29e'; c.fillRect(5, 7, 14, .4); c.fillRect(5, 8, 14, .4);
      c.fillStyle = gradient('#e8bf79', '#9e6f42', 8, 21); round(3, 9, 18, 12, 1);
      c.fillStyle = '#f5d79c'; c.fillRect(4, 9.5, 16, .6);
      c.fillStyle = '#f1e7cb'; round(6, 12, 9, 4, .5);
      c.fillStyle = '#7d6554'; c.fillRect(7, 13, 6, .5); c.fillRect(7, 14.3, 4, .5);
      c.fillStyle = '#a74651'; c.fillRect(17, 10, 1.7, 8);
    }
    texture.refresh();
  }
}
