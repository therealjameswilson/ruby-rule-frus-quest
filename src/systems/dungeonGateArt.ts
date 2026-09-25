import type Phaser from 'phaser';

/** Original stone jambs and steel shutter, drawn at four-times logical density. */
export function dungeonGateTexture(scene: Phaser.Scene, state: 'open' | 'locked' | 'sealed', accent: string) {
  const key = `dungeon-gate-v1-${state}-${accent}`;
  if (scene.textures.exists(key)) return key;
  // Lightweight render adapters can use the existing rectangle fallback.
  if (!scene.textures.createCanvas) return null;
  const texture = scene.textures.createCanvas(key, 160, 64);
  if (!texture) return null;
  const c = texture.getContext(); c.scale(4, 4);
  const rect = (x: number, y: number, w: number, h: number, fill: string | CanvasGradient) => { c.fillStyle = fill; c.fillRect(x, y, w, h); };
  rect(0, 1, 40, 14, '#17222a');
  const recess = c.createLinearGradient(0, 0, 0, 16);
  recess.addColorStop(0, '#080f16'); recess.addColorStop(1, '#35434a');
  rect(6, 1, 28, 14, recess);
  const stone = c.createLinearGradient(0, 0, 6, 0);
  stone.addColorStop(0, '#435360'); stone.addColorStop(.35, '#b4b8ae'); stone.addColorStop(1, '#657680');
  for (const x of [0, 34]) {
    rect(x, 0, 6, 16, stone); rect(x + .5, .5, 5, .6, '#ddd5bb');
    for (const y of [5, 10, 15]) { rect(x, y, 6, .6, '#35434c'); rect(x + .5, y + .65, 5, .3, '#b8bdb2'); }
    rect(x + .5, 1, .5, 14, '#a5b1aa');
  }
  rect(6, 14, 28, 2, '#253641'); rect(7, 14.3, 26, .6, accent);
  if (state === 'open') {
    // Shutter retracts into the lintel, leaving an unbroken passage.
    rect(7, .5, 26, 2, '#73848a'); rect(7, 1, 26, .45, '#c1c7bb');
    rect(7, 2.5, 26, .5, '#060f17');
    for (const x of [7, 31]) { rect(x, 5, 2, 5, '#253c42'); rect(x + .5, 6, 1, 3, '#77d7bb'); }
  } else {
    const steel = c.createLinearGradient(0, 2, 0, 14);
    steel.addColorStop(0, '#85949a'); steel.addColorStop(.4, '#506571'); steel.addColorStop(1, '#253b48');
    rect(7, 1, 26, 13, steel);
    for (let y = 3; y < 14; y += 3) { rect(7, y, 26, .65, '#1b303d'); rect(7, y + .7, 26, .3, '#94a19f'); }
    if (state === 'locked') {
      rect(7, 6, 26, 3, '#552b30'); rect(7, 6.2, 26, .6, '#ef7770');
      rect(7, 8.4, 26, .6, '#b83d49');
      for (const x of [8, 31]) { rect(x, 6.8, 1, 1, '#ebc17b'); }
    }
  }
  texture.refresh(); return key;
}
