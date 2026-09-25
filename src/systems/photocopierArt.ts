import type Phaser from 'phaser';

/** Original four-times-density copier cabinet, cached per status color. */
export function photocopierTexture(scene: Phaser.Scene, accent: string): string | null {
  const key = `photocopier-cabinet-v1-${accent}`;
  if (scene.textures.exists(key)) return key;
  const texture = scene.textures.createCanvas(key, 128, 128);
  if (!texture) return null;
  const c = texture.getContext(); c.scale(4, 4);
  const rect = (x: number, y: number, w: number, h: number, fill: string | CanvasGradient) => {
    c.fillStyle = fill; c.fillRect(x, y, w, h);
  };
  const metal = c.createLinearGradient(3, 0, 29, 0);
  metal.addColorStop(0, '#d0d8d8'); metal.addColorStop(.2, '#a5b3b8');
  metal.addColorStop(.75, '#7c8d97'); metal.addColorStop(1, '#435765');
  // Recessed casters and lower chassis keep the original footprint.
  for (const x of [6, 23]) {
    rect(x, 27, 4, 4, '#16232c'); rect(x + .5, 28, 1, 2.5, '#526672');
    rect(x + 1.5, 28.5, 1, 1, '#9faeaf');
  }
  rect(3, 8, 27, 21, '#14242e'); rect(3.7, 8.5, 25.3, 19.5, metal);
  rect(4, 9, .6, 18, '#e4e7db'); rect(27, 9, 2, 18, '#425561');
  // Paper feeder, hinges and scanner glass under the raised lid.
  rect(10, 1, 13, 3, '#263a46'); rect(10.8, 1, 11.4, 2, '#faf2dd');
  rect(11.5, 2, 10, .35, '#b6b9ac');
  rect(5, 3, 21, 5.5, '#1b303c'); rect(5.7, 3.3, 19.6, 3.8, metal);
  rect(6.3, 3.7, 18.4, .45, '#f1efdf');
  rect(7, 5, 16, 1.5, '#24434c'); rect(8, 5.2, 12, .35, '#76b2b0');
  rect(7, 7, 2, 1, '#81908e'); rect(22, 7, 2, 1, '#81908e');
  // Status lights align exactly with the runtime threat glow overlays.
  rect(5, 8, 23, 5, '#394c56'); rect(5, 8, 23, .5, '#c7d1cd');
  for (const x of [8, 19]) {
    rect(x, 9, 5, 3, '#10232b'); rect(x + 1, 10, 3, 1, accent);
    rect(x + .5, 9.3, 4, .25, '#6a8790');
  }
  for (let i = 0; i < 3; i++) rect(14 + i, 10, .6, 1, '#b1b9af');
  rect(25, 10, 1.5, 1.5, accent);
  // Quiet dark face leaves the existing CITE / NET / REF labels legible.
  rect(3, 13, 26, 9, '#12212d'); rect(4, 13, 24, .5, accent);
  rect(4, 21, 24, .5, '#566b76');
  // Output mouth with rollers, curled paper and a stepped receiving tray.
  rect(5, 22.5, 21, 4.5, '#182b35');
  for (const x of [7, 12, 17, 22]) rect(x, 23, 2, 1, '#687b82');
  c.fillStyle = '#eee8d5'; c.beginPath(); c.moveTo(8, 23.5); c.lineTo(22, 23.5);
  c.lineTo(23, 26); c.lineTo(9, 26); c.closePath(); c.fill();
  rect(10, 24, 9, .3, '#929b92'); rect(10.5, 24.8, 7, .3, '#afb5a7');
  rect(5, 27, 21, .65, '#d2d8ce'); rect(6, 27.7, 20, .4, '#3f535e');
  for (let i = 0; i < 4; i++) rect(27.5, 23 + i, 1, .35, '#172c37');
  for (const y of [12.2, 27]) rect(4.5, y, .5, .5, '#374e5c');
  texture.refresh();
  return key;
}
