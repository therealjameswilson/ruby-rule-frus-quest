import type Phaser from "phaser";
import { INTERIOR_TILES } from "../game/networkN1Tilemap";
import { packedTileGid } from "../game/packedTileIndex";

/** A continuous plaster cornice and walnut wainscot, clipped to solid map cells. */
export function addEditorialRoomWalls(scene: Phaser.Scene, tiles: readonly (readonly number[])[], x: number, y: number) {
  const wallIds = [INTERIOR_TILES.wallPanel, INTERIOR_TILES.wallMetal, INTERIOR_TILES.wallBrick, INTERIOR_TILES.wallBlue].map(packedTileGid);
  const mask = tiles.map(row => row.map(tile => wallIds.includes(tile)));
  const key = `editorial-walls-v1-${mask.map(row => row.map(Boolean).map(Number).join('')).join('-')}`;
  const width = tiles[0].length * 16, height = tiles.length * 16;
  if (!scene.textures.exists(key)) {
    const texture = scene.textures.createCanvas(key, width * 4, height * 4);
    if (!texture) return null;
    const c = texture.getContext(); c.scale(4, 4);
    mask.forEach((row, ty) => row.forEach((solid, tx) => {
      if (!solid) return;
      c.save(); c.translate(tx * 16 + 8, ty * 16 + 8);
      // Rotate the same profile toward the room interior; open cells stay clear.
      if (ty === mask.length - 1) c.rotate(Math.PI);
      else if (tx === 0 && ty !== 0) c.rotate(-Math.PI / 2);
      else if (tx === row.length - 1 && ty !== 0) c.rotate(Math.PI / 2);
      c.translate(-8, -8);
      const plaster = c.createLinearGradient(0, 0, 0, 10);
      plaster.addColorStop(0, '#85877c'); plaster.addColorStop(.2, '#ded9c6'); plaster.addColorStop(1, '#b2af9d');
      c.fillStyle = plaster; c.fillRect(0, 0, 16, 10);
      c.fillStyle = '#eeead7'; c.fillRect(0, 1, 16, .65); c.fillRect(0, 3, 16, .4);
      c.fillStyle = 'rgba(56,49,37,.28)'; c.fillRect(0, 3.5, 16, .6);
      const wood = c.createLinearGradient(0, 9, 0, 16);
      wood.addColorStop(0, '#8c6947'); wood.addColorStop(.25, '#654b36'); wood.addColorStop(1, '#302c29');
      c.fillStyle = wood; c.fillRect(0, 9, 16, 7);
      c.fillStyle = '#c4a979'; c.fillRect(0, 9, 16, .55);
      c.fillStyle = 'rgba(210,166,102,.22)';
      for (let grain = 0; grain < 5; grain++) c.fillRect(0, 10.4 + grain * .7, 16, .15);
      // Recessed joinery every two cells avoids the old repeated metal blocks.
      if ((tx + ty) % 2 === 0) {
        c.fillStyle = 'rgba(20,19,18,.36)'; c.fillRect(.3, 10, .55, 4.5);
        c.fillStyle = 'rgba(224,191,133,.24)'; c.fillRect(.9, 10, .3, 4.5);
      }
      c.fillStyle = '#22292c'; c.fillRect(0, 15.2, 16, .8);
      c.restore();
    }));
    texture.refresh();
  }
  return scene.add.image(x, y, key).setOrigin(0).setDisplaySize(width, height).setDepth(46).setName('editorial-walls');
}
