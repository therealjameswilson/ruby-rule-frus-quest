import type Phaser from 'phaser';

/** Original desktop terminal cabinet; StateChat remains screen text only. */
export function addArchiveTerminalArt(scene: Phaser.Scene, x: number, y: number) {
  const key = 'archive-terminal-cabinet-v1';
  if (!scene.textures.exists(key)) {
    const texture = scene.textures.createCanvas(key, 152, 120);
    if (!texture) return null;
    const c = texture.getContext(); c.scale(4, 4);
    const shell = c.createLinearGradient(0, 0, 38, 28);
    shell.addColorStop(0, '#d1cebb'); shell.addColorStop(.45, '#89918b'); shell.addColorStop(1, '#4d5b5e');
    c.fillStyle = '#23323b'; c.fillRect(1, 1, 36, 27);
    c.fillStyle = shell; c.fillRect(2, 1, 34, 22);
    c.fillStyle = '#e8e0c8'; c.fillRect(3, 1.5, 32, .6);
    c.fillStyle = '#b5b3a1'; c.fillRect(2, 2, .7, 20);
    c.fillStyle = '#344047'; c.fillRect(4, 5, 30, 16);
    c.strokeStyle = '#d7cbaa'; c.lineWidth = .5; c.strokeRect(4, 5, 30, 16);
    const glass = c.createLinearGradient(0, 6, 0, 20);
    glass.addColorStop(0, '#152b35'); glass.addColorStop(.5, '#273a42'); glass.addColorStop(1, '#101b28');
    c.fillStyle = glass; c.fillRect(5, 6, 28, 14);
    c.fillStyle = 'rgba(174,214,207,.10)'; c.fillRect(6, 7, 26, .6);
    // A sloping keyboard deck, with inset key rows and ventilation slots.
    c.fillStyle = '#687873'; c.beginPath(); c.moveTo(2, 22); c.lineTo(36, 22); c.lineTo(38, 28); c.lineTo(0, 28); c.closePath(); c.fill();
    c.fillStyle = '#26343b'; c.fillRect(0, 28, 38, 2); c.fillRect(10, 23, 22, 4);
    c.fillStyle = '#bbb9a7';
    for (let row = 0; row < 2; row++) for (let col = 0; col < 8; col++) c.fillRect(11 + col * 2.5, 23.5 + row * 1.5, 1.8, .9);
    c.fillStyle = '#334148';
    for (let col = 0; col < 6; col++) c.fillRect(24 + col * 1.5, 2.7, .7, 1);
    c.fillStyle = '#d9bd75'; c.fillRect(5, 2.5, 8, 1);
    texture.refresh();
  }
  return scene.add.image(x, y, key).setDisplaySize(38, 30).setName('archive-source-room-statechat-frame');
}
