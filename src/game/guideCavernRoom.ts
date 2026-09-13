import { GAMEPLAY_TILESETS } from "../assets/registry";
import { EMPTY_TILE, packedTileGid } from "./packedTileIndex";

export const GUIDE_CAVERN_ROOM = { x: 16, y: 42, columns: 14, rows: 10 } as const;
const tileSize = GAMEPLAY_TILESETS.archiveDungeonNative.tileSize;
export const GUIDE_CAVERN_BOUNDS = {
  left: GUIDE_CAVERN_ROOM.x + tileSize + 8,
  right: GUIDE_CAVERN_ROOM.x + (GUIDE_CAVERN_ROOM.columns - 1) * tileSize - 8,
  top: GUIDE_CAVERN_ROOM.y + tileSize + 12,
  bottom: GUIDE_CAVERN_ROOM.y + (GUIDE_CAVERN_ROOM.rows - 1) * tileSize - 6
} as const;

// Manifest's 7-column native sheet: floors (row 1), masonry (row 2), torches (row 4).
// Later fill rows contain shaded bottom edges that become stripes when repeated.
export const GUIDE_CAVERN_TILES = {
  floor: 0, scuff: 5, crack: 1, inset: 2,
  wall: 8, corner: 7, torch: 21
} as const;

export function buildGuideCavernLayers() {
  const { columns, rows } = GUIDE_CAVERN_ROOM;
  const ground = Array.from({ length: rows }, () => Array<number>(columns).fill(packedTileGid(GUIDE_CAVERN_TILES.floor)));
  const walls = Array.from({ length: rows }, () => Array<number>(columns).fill(EMPTY_TILE));
  const decoration = Array.from({ length: rows }, () => Array<number>(columns).fill(EMPTY_TILE));
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < columns; x++) {
      if (x !== 0 && x !== columns - 1 && y !== 0 && y !== rows - 1) continue;
      const corner = (x === 0 || x === columns - 1) && (y === 0 || y === rows - 1);
      walls[y][x] = packedTileGid(corner ? GUIDE_CAVERN_TILES.corner : GUIDE_CAVERN_TILES.wall);
    }
  }
  ground[2][2] = ground[7][10] = packedTileGid(GUIDE_CAVERN_TILES.scuff);
  ground[3][11] = packedTileGid(GUIDE_CAVERN_TILES.crack);
  ground[7][3] = packedTileGid(GUIDE_CAVERN_TILES.inset);
  decoration[0][3] = decoration[0][10] = packedTileGid(GUIDE_CAVERN_TILES.torch);
  return { ground, walls, decoration };
}
