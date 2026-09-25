import type Phaser from 'phaser';
import { dispatchShelfCell } from '../game/referralDispatch';

/** Shelf faces follow the same occupied cells as the dispatch collision map. */
export function addDispatchShelfArt(scene: Phaser.Scene, open: boolean) {
  const key = `dispatch-shelves-${open ? 'open' : 'closed'}-v1`;
  if (!scene.textures.exists(key)) {
    const texture = scene.textures.createCanvas(key, 512, 256);
    if (!texture) return null;
    const c = texture.getContext(); c.scale(4, 4);
    for (let row = 4; row <= 7; row++) for (let col = 4; col <= 11; col++) {
      if (!dispatchShelfCell(col, row, open)) continue;
      const x = (col - 4) * 16, y = (row - 4) * 16;
      c.fillStyle = '#273536'; c.fillRect(x, y, 16, 16);
      const steel = c.createLinearGradient(0, y, 0, y + 16);
      steel.addColorStop(0, '#a1aaa0'); steel.addColorStop(.2, '#66766d'); steel.addColorStop(1, '#354742');
      c.fillStyle = steel; c.fillRect(x, y, 16, 3); c.fillRect(x, y + 13, 16, 3);
      c.fillStyle = '#b4b9a5'; c.fillRect(x, y, 16, .5);
      for (let box = 0; box < 3; box++) {
        const bx = x + 1 + box * 5, by = y + 4;
        c.fillStyle = (col + row + box) % 4 === 0 ? '#704c45' : '#a99976';
        c.fillRect(bx, by, 4, 9);
        c.fillStyle = '#d4c7a5'; c.fillRect(bx, by, 4, .6);
        c.fillStyle = '#e9dfc5'; c.fillRect(bx + .7, by + 3, 2.6, 2);
        c.fillStyle = '#4b4c40'; c.fillRect(bx + 1.2, by + 3.7, 1.5, .35);
        c.fillStyle = 'rgba(25,32,30,.4)'; c.fillRect(bx + 3.5, by + 1, .5, 8);
      }
      if (col === 4 || col === 11 || (open && (col === 6 || col === 9))) {
        const post = col === 11 || col === 6 ? x + 15 : x;
        c.fillStyle = '#a0a897'; c.fillRect(post, y, 1, 16);
      }
    }
    texture.refresh();
  }
  return scene.add.image(128, 128, key).setDisplaySize(128, 64).setDepth(160).setName('dispatch-detailed-shelves');
}
