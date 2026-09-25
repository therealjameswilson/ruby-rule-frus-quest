import type Phaser from 'phaser';

/** Quiet raised-floor panels with distinct public/protected work areas. */
export function addNetworkRoomFloor(scene: Phaser.Scene, split: boolean) {
  const key = split ? 'network-split-floor-v1' : 'network-vault-floor-v1';
  if (!scene.textures.exists(key)) {
    const texture = scene.textures.createCanvas(key, 1024, 832);
    if (!texture) return null;
    const c = texture.getContext(); c.scale(4, 4);
    c.fillStyle = '#25313b'; c.fillRect(0, 0, 256, 208);
    const panel = (x: number, width: number, top: string, bottom: string) => {
      const gradient = c.createLinearGradient(0, 16, 0, 176);
      gradient.addColorStop(0, top); gradient.addColorStop(1, bottom);
      c.fillStyle = gradient; c.fillRect(x, 16, width, 160);
    };
    if (split) {
      panel(16, 112, '#77918c', '#435d5d');
      panel(128, 112, '#78818d', '#434d60');
    } else {
      panel(16, 224, '#78818a', '#414f60');
      panel(112, 32, '#737b87', '#444d5e');
    }
    // Broad, softly joined panels replace the high-contrast 16px checkerboard.
    c.lineWidth = .35; c.strokeStyle = 'rgba(15,29,37,.25)';
    for (let x = 16; x <= 240; x += 32) { c.beginPath(); c.moveTo(x, 16); c.lineTo(x, 176); c.stroke(); }
    for (let y = 16; y <= 176; y += 32) { c.beginPath(); c.moveTo(16, y); c.lineTo(240, y); c.stroke(); }
    let seed = 811;
    for (let i = 0; i < 9000; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; const x = 16 + (seed / 4294967296) * 224;
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; const y = 16 + (seed / 4294967296) * 160;
      c.fillStyle = i % 2 ? 'rgba(220,230,218,.065)' : 'rgba(10,24,35,.075)'; c.fillRect(x, y, .35, .25);
    }
    c.strokeStyle = 'rgba(202,211,190,.4)'; c.lineWidth = .65; c.strokeRect(21, 21, 214, 150);
    // Recessed utility strips and a soft top-wall shadow ground the equipment.
    for (const x of [18, 236]) {
      c.fillStyle = '#31454e'; c.fillRect(x, 24, 2, 144);
      c.fillStyle = '#91a69f'; c.fillRect(x, 24, .4, 144);
    }
    const shadow = c.createLinearGradient(0, 16, 0, 35);
    shadow.addColorStop(0, 'rgba(8,16,25,.35)'); shadow.addColorStop(1, 'rgba(8,16,25,0)');
    c.fillStyle = shadow; c.fillRect(16, 16, 224, 19);
    texture.refresh();
  }
  return scene.add.image(128, 136, key).setDisplaySize(256, 208).setDepth(-12).setName('network-detailed-floor');
}
