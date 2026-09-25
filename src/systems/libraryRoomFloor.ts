import type Phaser from 'phaser';

/** Original materials baked once; all coordinates are relative to the room's y=32. */
export function addLibraryRoomFloor(scene: Phaser.Scene) {
  const key = 'library-reading-floor-v1';
  if (!scene.textures.exists(key)) {
    const texture = scene.textures.createCanvas(key, 1024, 832);
    if (!texture) return null;
    const c = texture.getContext(); c.scale(4, 4);
    c.fillStyle = '#483c31'; c.fillRect(0, 0, 256, 208);
    const oak = c.createLinearGradient(0, 16, 0, 192);
    oak.addColorStop(0, '#9a7958'); oak.addColorStop(1, '#6a513e');
    c.fillStyle = oak; c.fillRect(16, 16, 224, 176);
    let seed = 9137;
    const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    // Long boards and staggered joints provide scale without a noisy checkerboard.
    for (let y = 16, row = 0; y < 192; y += 8, row++) {
      c.fillStyle = `rgba(255,220,157,${random() * .045})`; c.fillRect(16, y, 224, 8);
      c.strokeStyle = 'rgba(33,25,22,.22)'; c.lineWidth = .35;
      c.beginPath(); c.moveTo(16, y); c.lineTo(240, y); c.stroke();
      for (let x = 16 + (row % 3) * 19; x < 240; x += 57) {
        c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 8); c.stroke();
      }
    }
    for (let i = 0; i < 6000; i++) {
      c.fillStyle = i % 2 ? 'rgba(246,220,180,.07)' : 'rgba(32,23,21,.09)';
      c.fillRect(16 + random() * 224, 16 + random() * 176, 1 + random() * 4, .15);
    }
    const rug = (x: number, y: number, w: number, h: number) => {
      c.fillStyle = 'rgba(19,24,27,.2)'; c.fillRect(x + .7, y + 1, w, h);
      c.fillStyle = '#354f55'; c.fillRect(x, y, w, h);
      c.strokeStyle = '#a39370'; c.lineWidth = .5; c.strokeRect(x + 2, y + 2, w - 4, h - 4);
      c.strokeStyle = 'rgba(192,177,134,.26)'; c.strokeRect(x + 3.3, y + 3.3, w - 6.6, h - 6.6);
      for (let i = 0; i < w * h / 2; i++) {
        c.fillStyle = 'rgba(223,220,188,.055)'; c.fillRect(x + random() * w, y + random() * h, .35, .16);
      }
    };
    rug(110, 42, 36, 150);
    // The rugs encompass furniture and its approach, leaving the cross aisles open.
    for (const x of [48, 202]) for (const y of [63, 131]) {
      rug(x - 28, y - 9, 56, 39);
      const light = c.createRadialGradient(x - 5, y - 9, 1, x - 5, y - 9, 36);
      light.addColorStop(0, 'rgba(255,225,163,.18)'); light.addColorStop(1, 'rgba(255,225,163,0)');
      c.fillStyle = light; c.fillRect(x - 36, y - 36, 72, 72);
      const shadow = c.createRadialGradient(x + 1, y + 10, 3, x + 1, y + 10, 27);
      shadow.addColorStop(0, 'rgba(12,20,24,.25)'); shadow.addColorStop(1, 'rgba(12,20,24,0)');
      c.save(); c.translate(x + 1, y + 10); c.scale(1, .3); c.translate(-x - 1, -y - 10);
      c.fillStyle = shadow; c.fillRect(x - 27, y - 17, 56, 54); c.restore();
    }
    const shade = c.createLinearGradient(0, 16, 0, 36);
    shade.addColorStop(0, 'rgba(13,22,29,.4)'); shade.addColorStop(1, 'rgba(13,22,29,0)');
    c.fillStyle = shade; c.fillRect(16, 16, 224, 20);
    texture.refresh();
  }
  return scene.add.image(128, 136, key).setDisplaySize(256, 208).setDepth(2).setName('library-reading-room-floor');
}
