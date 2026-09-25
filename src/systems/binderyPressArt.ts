import type Phaser from 'phaser';

/** Original screw press; its base aligns with the existing 48 by 16 solid. */
export function addBinderyPressArt(scene: Phaser.Scene, x: number, y: number) {
  const key = 'bindery-screw-press-v1';
  if (!scene.textures.exists(key)) {
    const texture = scene.textures.createCanvas(key, 192, 144);
    if (!texture) return null;
    const c = texture.getContext(); c.scale(4, 4);
    const metal = (left: number, top: number, width: number, height: number) => {
      const g = c.createLinearGradient(left, 0, left + width, 0);
      g.addColorStop(0, '#283238'); g.addColorStop(.3, '#798b8b');
      g.addColorStop(.48, '#afbcaf'); g.addColorStop(.65, '#52656a'); g.addColorStop(1, '#202c32');
      c.fillStyle = g; c.fillRect(left, top, width, height);
      c.strokeStyle = '#17232b'; c.lineWidth = .45; c.strokeRect(left, top, width, height);
    };
    // Walnut bed and cast-iron uprights, with restrained brass hardware.
    const wood = c.createLinearGradient(0, 24, 0, 35);
    wood.addColorStop(0, '#9a714c'); wood.addColorStop(.35, '#644732'); wood.addColorStop(1, '#332b29');
    c.fillStyle = wood; c.fillRect(1, 25, 46, 10);
    c.strokeStyle = '#c5a274'; c.lineWidth = .5; c.strokeRect(2, 26, 44, 7);
    c.fillStyle = '#211f20'; c.fillRect(4, 34, 7, 2); c.fillRect(37, 34, 7, 2);
    metal(5, 6, 5, 23); metal(38, 6, 5, 23); metal(5, 6, 38, 4);
    metal(22, 4, 4, 17);
    c.strokeStyle = '#1b2930'; c.lineWidth = .5;
    for (let top = 10; top < 20; top += 1.3) { c.beginPath(); c.moveTo(22, top + 1); c.lineTo(26, top); c.stroke(); }
    // Hand wheel and platen above the bound volume.
    c.strokeStyle = '#b99c62'; c.lineWidth = 1.4;
    c.beginPath(); c.ellipse(24, 3.8, 8, 2.4, 0, 0, Math.PI * 2); c.stroke();
    c.beginPath(); c.moveTo(16, 3.8); c.lineTo(32, 3.8); c.moveTo(24, 1.4); c.lineTo(24, 6.2); c.stroke();
    metal(12, 19, 24, 3);
    c.fillStyle = '#4a1728'; c.fillRect(14, 22, 20, 6);
    c.fillStyle = '#ae3546'; c.fillRect(14, 22, 20, 1.4); c.fillRect(14, 27, 20, 1);
    c.fillStyle = '#e0d1ad'; c.fillRect(16, 23.4, 17, 3.2);
    c.fillStyle = '#a48e65'; c.fillRect(17, 24.4, 15, .25); c.fillRect(17, 25.4, 15, .25);
    c.fillStyle = '#d0b47c';
    for (const left of [7.5, 40.5]) for (const top of [8, 27]) { c.beginPath(); c.arc(left, top, .7, 0, Math.PI * 2); c.fill(); }
    c.fillRect(20, 30, 8, 2); c.fillStyle = '#5a4630'; c.fillRect(21, 30.7, 6, .5);
    texture.refresh();
  }
  return scene.add.image(x, y - 10, key).setDisplaySize(48, 36).setDepth(y + 8).setName('bindery-screw-press');
}
