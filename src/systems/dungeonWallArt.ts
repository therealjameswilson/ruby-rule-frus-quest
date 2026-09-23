import Phaser from "phaser";
import { INTERIOR_TILES } from "../game/networkN1Tilemap";
import { packedTileGid } from "../game/packedTileIndex";

// Draw at native resolution: filled integer rectangles avoid half-pixel strokes
// and keep mortar and bevels legible on both desktop and high-DPI phones.
export function drawDungeonStoneBlock(scene: Phaser.Scene, x: number, y: number, accent: string, depth = 40) {
  const stone = scene.add.graphics().setPosition(Math.round(x) - 8, Math.round(y) - 8)
    .setDepth(depth).setName("crisp-dungeon-wall");
  const rect = (left: number, top: number, width: number, height: number, tint: number) => {
    stone.fillStyle(tint, 1);
    stone.fillRect(left, top, width, height);
  };
  rect(0, 0, 16, 16, 0x18212b);
  // Two staggered courses, with one-pixel mortar between each block.
  for (const [left, top, width, height] of [[1, 1, 14, 6], [1, 8, 6, 7], [8, 8, 7, 7]]) {
    rect(left, top, width, height, 0x677780);
    rect(left, top, width, 1, 0xb6c2c2);
    rect(left, top + 1, 1, height - 2, 0x8d9fa7);
    rect(left + 1, top + height - 1, width - 1, 1, 0x34434e);
    rect(left + width - 1, top + 1, 1, height - 2, 0x465662);
  }
  // A restrained metal inset ties the stone to each dungeon's accent color.
  rect(11, 3, 3, 2, Phaser.Display.Color.HexStringToColor(accent).color);
  rect(11, 5, 3, 1, 0x34434e);
  return stone;
}

export function drawDungeonWallTorch(scene: Phaser.Scene, x: number, y: number) {
  const torch = scene.add.graphics().setPosition(Math.round(x) - 8, Math.round(y) - 8)
    .setDepth(47).setName("crisp-dungeon-wall-torch");
  for (const [left, top, width, height, tint] of [
    [6, 8, 5, 7, 0x18212b], [7, 8, 3, 5, 0x80613a],
    [5, 8, 7, 2, 0xb6c2c2], [6, 4, 5, 4, 0xb82030],
    [7, 2, 3, 6, 0xe68c32], [8, 1, 1, 6, 0xf8d878],
    [7, 6, 3, 2, 0xf8f0d8]
  ]) {
    torch.fillStyle(tint, 1); torch.fillRect(left, top, width, height);
  }
  return torch;
}

export function drawCrispInteriorWalls(
  scene: Phaser.Scene, tiles: readonly (readonly number[])[], x: number, y: number,
  accent: string, track: (object: Phaser.GameObjects.Graphics) => void
) {
  const wallTiles = [INTERIOR_TILES.wallPanel, INTERIOR_TILES.wallMetal, INTERIOR_TILES.wallBrick, INTERIOR_TILES.wallBlue].map(packedTileGid);
  tiles.forEach((row, tileY) => row.forEach((tile, tileX) => {
    if (!wallTiles.includes(tile)) return;
    track(drawDungeonStoneBlock(scene, x + tileX * 16 + 8, y + tileY * 16 + 8, accent, 46));
  }));
}
