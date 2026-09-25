import type Phaser from 'phaser';

/** Original aluminum can, shared by the compact control and its thrown item. */
export function sodaCanTexture(scene: Phaser.Scene, accent: number) {
  const key = `soda-can-${accent.toString(16)}-v1`;
  if (!scene.textures.exists(key)) {
    if (!scene.textures.createCanvas) return null;
    const texture = scene.textures.createCanvas(key, 48, 72);
    if (!texture) return null;
    const c = texture.getContext(); c.scale(4, 4);
    const body = c.createLinearGradient(1, 0, 11, 0);
    body.addColorStop(0, '#596970'); body.addColorStop(.22, '#e1e6db');
    body.addColorStop(.5, '#b6c3bd'); body.addColorStop(.84, '#869996'); body.addColorStop(1, '#40545c');
    c.fillStyle = '#24343c'; c.fillRect(1, 3, 10, 12);
    c.fillStyle = body; c.fillRect(1.5, 3, 9, 11.5);
    c.beginPath(); c.ellipse(6, 14.4, 4.5, 1.4, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = `#${accent.toString(16).padStart(6, '0')}`; c.fillRect(1.6, 5, 8.8, 7.4);
    const shine = c.createLinearGradient(1.5, 0, 10.5, 0);
    shine.addColorStop(0, 'rgba(0,20,30,.28)'); shine.addColorStop(.28, 'rgba(255,255,225,.30)');
    shine.addColorStop(.65, 'rgba(255,255,225,0)'); shine.addColorStop(1, 'rgba(0,20,30,.26)');
    c.fillStyle = shine; c.fillRect(1.6, 5, 8.8, 7.4);
    c.fillStyle = '#edf0d9'; c.beginPath(); c.arc(6, 8.8, 2, 0, Math.PI * 2); c.fill();
    c.strokeStyle = 'rgba(40,75,63,.6)'; c.lineWidth = .4;
    c.beginPath(); c.moveTo(6, 7.2); c.lineTo(6, 10.4); c.moveTo(4.4, 8.8); c.lineTo(7.6, 8.8); c.stroke();
    c.fillStyle = '#dce2d7'; c.beginPath(); c.ellipse(6, 3, 4.5, 1.6, 0, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#647b7d'; c.lineWidth = .45; c.stroke();
    c.fillStyle = '#435c63'; c.beginPath(); c.ellipse(6, 3, 1.3, .7, -.25, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#f3eee0'; c.lineWidth = .35; c.stroke();
    c.fillStyle = 'rgba(255,255,255,.45)'; c.fillRect(2.6, 4.6, .45, 9.3);
    texture.refresh();
  }
  return key;
}
