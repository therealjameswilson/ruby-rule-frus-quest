import Phaser from 'phaser';

/** Cached miniature stationery, drawn at eight times logical size. */
export function reviewPacketArt(scene: Phaser.Scene, accent: string, compact: boolean) {
  const key = `review-packet-v1-${accent.replace('#', '')}`;
  if (!scene.textures.exists(key)) {
    const texture = scene.textures.createCanvas(key, 256, 192);
    if (!texture) return null;
    const c = texture.getContext(); c.scale(8, 8);
    c.fillStyle = 'rgba(9,17,24,.25)'; c.beginPath(); c.ellipse(16, 20, 13, 2, 0, 0, Math.PI * 2); c.fill();
    // Back folder, tab and offset leaves give a physical stack silhouette.
    c.fillStyle = '#664936'; c.fillRect(3, 5, 26, 15);
    c.fillStyle = '#ae8352'; c.fillRect(3, 4, 25, 15); c.fillRect(5, 2, 10, 4);
    c.strokeStyle = '#705235'; c.lineWidth = .5; c.strokeRect(3.25, 4.25, 24.5, 14.5);
    for (let i = 0; i < 3; i++) {
      c.fillStyle = ['#b6ad92', '#d4cab0', '#eee6ce'][i];
      c.fillRect(5 + i * .3, 4.3 + i * .6, 21, 12.4);
      c.strokeStyle = '#9e947b'; c.lineWidth = .25; c.strokeRect(5 + i * .3, 4.3 + i * .6, 21, 12.4);
    }
    const face = c.createLinearGradient(0, 8, 0, 20);
    face.addColorStop(0, '#e0c48f'); face.addColorStop(1, '#bda06c');
    c.fillStyle = face; c.beginPath(); c.moveTo(3, 9); c.lineTo(28, 9); c.lineTo(27, 20); c.lineTo(4, 20); c.closePath(); c.fill();
    c.strokeStyle = '#6f5038'; c.lineWidth = .55; c.stroke();
    c.strokeStyle = '#f0dca7'; c.lineWidth = .35; c.beginPath(); c.moveTo(4, 9.7); c.lineTo(27, 9.7); c.stroke();
    // A colored routing tab, a paper label and a tied archival string.
    c.fillStyle = accent; c.fillRect(6, 2.8, 7.5, 1.2); c.fillRect(3.6, 10, 2, 8);
    c.fillStyle = '#efe7d2'; c.fillRect(9, 11.2, 13, 5.5);
    c.fillStyle = '#7c7565'; c.fillRect(10.3, 12.3, 7, .45); c.fillRect(10.3, 13.6, 9.5, .35);
    c.fillStyle = '#963b31'; c.fillRect(18.5, 14.7, 2.3, .5);
    c.strokeStyle = '#685140'; c.lineWidth = .5; c.beginPath(); c.moveTo(25, 5); c.lineTo(24.3, 19.6); c.stroke();
    c.strokeStyle = '#ebd8ac'; c.lineWidth = .35; c.beginPath(); c.moveTo(24.5, 5); c.lineTo(23.8, 19.6); c.stroke();
    texture.refresh();
  }
  const image = scene.add.image(0, 0, key).setDisplaySize(compact ? 15 : 28, compact ? 11.25 : 21);
  image.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
  return image.setName('review-packet-art');
}

export function reviewInboxArt(scene: Phaser.Scene) {
  const key = 'review-inbox-tray-v1';
  if (!scene.textures.exists(key)) {
    const texture = scene.textures.createCanvas(key, 320, 192);
    if (!texture) return null;
    const c = texture.getContext(); c.scale(8, 8);
    c.fillStyle = 'rgba(10,17,24,.3)'; c.beginPath(); c.ellipse(20, 19, 18, 3, 0, 0, Math.PI * 2); c.fill();
    const wood = c.createLinearGradient(0, 2, 0, 20); wood.addColorStop(0, '#a17442'); wood.addColorStop(1, '#4b3428');
    c.fillStyle = wood; c.fillRect(2, 4, 36, 15);
    c.fillStyle = '#392d25'; c.fillRect(5, 6, 30, 9);
    c.fillStyle = '#635442'; c.fillRect(6, 7, 28, 7);
    for (let i = 0; i < 3; i++) { c.fillStyle = ['#a99f84', '#c9bea0', '#e8dbb9'][i]; c.fillRect(10 - i * .6, 8 + i, 19, 4); }
    c.fillStyle = '#715037'; c.fillRect(2, 14, 36, 5);
    c.strokeStyle = '#bd9861'; c.lineWidth = .45; c.strokeRect(2.5, 4.5, 35, 14);
    c.strokeStyle = 'rgba(225,189,128,.35)'; c.lineWidth = .2;
    for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(4, 15 + i * .6); c.lineTo(36, 15.3 + i * .6); c.stroke(); }
    c.fillStyle = '#b69c66'; c.fillRect(15, 15.5, 10, 2.2); c.fillStyle = '#34332b'; c.fillRect(16, 16, 8, 1.2);
    c.fillStyle = '#392a21'; c.fillRect(4, 19, 3, 1.5); c.fillRect(33, 19, 3, 1.5);
    texture.refresh();
  }
  const image = scene.add.image(0, 0, key).setDisplaySize(40, 24).setName('review-inbox-art');
  image.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
  return image;
}
