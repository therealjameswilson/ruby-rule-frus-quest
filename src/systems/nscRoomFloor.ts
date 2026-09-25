import type Phaser from 'phaser';

/** Original reading-room materials, baked once per chamber at four-times density. */
export function addNscRoomFloor(scene: Phaser.Scene, room: number) {
  const stage = Math.max(0, Math.min(2, Math.floor(room)));
  const key = `nsc-reading-floor-${stage}-v1`;
  if (!scene.textures.exists(key)) {
    const texture = scene.textures.createCanvas(key, 1024, 832);
    if (!texture) return null;
    const c = texture.getContext(); c.scale(4, 4);
    c.fillStyle = '#3e3934'; c.fillRect(0, 0, 256, 208);
    const stone = c.createLinearGradient(0, 16, 0, 192);
    stone.addColorStop(0, '#b3ad96'); stone.addColorStop(1, '#8b8979');
    c.fillStyle = stone; c.fillRect(16, 16, 224, 176);
    c.strokeStyle = 'rgba(53,57,54,.18)'; c.lineWidth = .35;
    for (let y = 16; y < 192; y += 24) {
      c.beginPath(); c.moveTo(16, y); c.lineTo(240, y); c.stroke();
      for (let x = 16 + (y % 48 ? 0 : 20); x < 240; x += 40) {
        c.beginPath(); c.moveTo(x, y); c.lineTo(x, Math.min(y + 24, 192)); c.stroke();
      }
    }
    // Each stage has its own reading-room finish. Keep the central route continuous.
    const palette = [['#88674b', '#624934'], ['#627a70', '#405a53'], ['#647785', '#425765']][stage];
    const inset = c.createLinearGradient(0, 40, 0, 176);
    inset.addColorStop(0, palette[0]); inset.addColorStop(1, palette[1]);
    c.fillStyle = inset; c.fillRect(28, 44, 200, 132);
    if (stage === 0) {
      // Oak boards with staggered end joints: catalog hall reads as a wood interior.
      c.strokeStyle = 'rgba(37,28,23,.24)'; c.lineWidth = .4;
      for (let y = 44; y < 176; y += 8) {
        c.beginPath(); c.moveTo(28, y); c.lineTo(228, y); c.stroke();
        for (let x = 28 + (y % 16 ? 22 : 0); x < 228; x += 44) {
          c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 8); c.stroke();
        }
      }
    }
    let seed = 7801 + stage;
    const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    for (let i = 0; i < 13000; i++) {
      c.fillStyle = i % 2 ? 'rgba(244,228,196,.08)' : 'rgba(20,29,33,.08)';
      c.fillRect(28 + random() * 200, 44 + random() * 132, stage ? .3 : 1.5, .18);
    }
    c.strokeStyle = 'rgba(222,201,156,.6)'; c.lineWidth = .6;
    c.strokeRect(31, 47, 194, 126);
    // A runner joins the doors; smaller desk rugs separate the two reading stations.
    c.fillStyle = '#34474c'; c.fillRect(108, 48, 40, 144);
    c.strokeStyle = '#a39772'; c.lineWidth = .5;
    for (const x of [111, 145]) { c.beginPath(); c.moveTo(x, 48); c.lineTo(x, 192); c.stroke(); }
    for (const x of [62, 194]) {
      c.fillStyle = 'rgba(27,36,37,.27)'; c.fillRect(x - 29, 69, 58, 44);
      c.strokeStyle = 'rgba(222,201,156,.4)'; c.strokeRect(x - 27, 71, 54, 40);
      // Warm reading light and a short contact shadow anchor the existing desk.
      const glow = c.createRadialGradient(x, 82, 2, x, 82, 39);
      glow.addColorStop(0, 'rgba(255,229,172,.17)'); glow.addColorStop(1, 'rgba(255,229,172,0)');
      c.fillStyle = glow; c.fillRect(x - 39, 43, 78, 78);
      c.fillStyle = 'rgba(20,24,26,.18)'; c.beginPath(); c.ellipse(x + 1, 97, 25, 6, 0, 0, Math.PI * 2); c.fill();
    }
    const shade = c.createLinearGradient(0, 16, 0, 42);
    shade.addColorStop(0, 'rgba(17,24,29,.42)'); shade.addColorStop(1, 'rgba(17,24,29,0)');
    c.fillStyle = shade; c.fillRect(16, 16, 224, 26);
    texture.refresh();
  }
  return scene.add.image(128, 136, key).setDisplaySize(256, 208).setDepth(2).setName('nsc-reading-room-floor');
}
