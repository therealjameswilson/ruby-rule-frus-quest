import type Phaser from 'phaser';

/** A shallow walnut document tray aligned with the inbox's existing solid. */
export function addBinderyInboxArt(scene: Phaser.Scene, x: number, y: number) {
  const key = 'bindery-document-tray-v1';
  if (!scene.textures.exists(key)) {
    const texture = scene.textures.createCanvas(key, 128, 64);
    if (!texture) return null;
    const c = texture.getContext(); c.scale(4, 4);
    c.fillStyle = 'rgba(8,15,20,.35)';
    c.beginPath(); c.ellipse(16, 14.5, 15.5, 1.5, 0, 0, Math.PI * 2); c.fill();
    const wood = c.createLinearGradient(0, 1, 0, 14);
    wood.addColorStop(0, '#bd9360'); wood.addColorStop(.25, '#745135'); wood.addColorStop(1, '#352923');
    c.fillStyle = wood; c.fillRect(0, 1, 32, 12);
    c.fillStyle = '#b28b58'; c.fillRect(.5, 1, 31, .75);
    c.fillStyle = '#1d2528'; c.fillRect(2, 3, 28, 8);
    const felt = c.createLinearGradient(0, 3, 0, 11);
    felt.addColorStop(0, '#263d37'); felt.addColorStop(1, '#405247');
    c.fillStyle = felt; c.fillRect(3, 4, 26, 6);
    c.strokeStyle = '#7d8b68'; c.lineWidth = .25; c.strokeRect(4, 5, 24, 4);
    c.fillStyle = wood; c.fillRect(0, 10, 32, 4);
    c.fillStyle = '#bd9660'; c.fillRect(1, 10, 30, .6);
    c.fillStyle = '#32241d'; c.fillRect(12, 10, 8, 1.2);
    c.fillStyle = '#c1a56c'; c.fillRect(12, 11.6, 8, 1.7);
    c.fillStyle = '#5b4730'; c.fillRect(13, 12.1, 6, .6);
    for (const left of [1.5, 30]) {
      c.fillStyle = '#dfbd7b'; c.fillRect(left, 2.5, .5, 1);
      c.fillRect(left, 11.5, .5, 1);
    }
    texture.refresh();
  }
  return scene.add.image(x, y, key).setDisplaySize(32, 16).setDepth(y + 6).setName('bindery-document-tray');
}
