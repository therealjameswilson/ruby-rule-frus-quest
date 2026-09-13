import { GAMEPLAY_TILESETS } from "../assets/registry";
import { EMPTY_TILE, packedTileGid } from "./packedTileIndex";
import { ARCHIVE_DUNGEON_TILES } from "./archiveA1Tilemap";

interface Rect { x: number; y: number; width: number; height: number }

// Cover only complete walkable tiles; retain the source art at obstacles and borders.
export function archiveWalkFloor(bounds: Rect, solids: readonly Rect[]) {
  const size = GAMEPLAY_TILESETS.archiveDungeonNative.tileSize;
  const x = Math.ceil((bounds.x + size) / size) * size;
  const y = Math.ceil((bounds.y + size) / size) * size;
  const columns = Math.max(0, Math.floor((bounds.x + bounds.width - size - x) / size));
  const rows = Math.max(0, Math.floor((bounds.y + bounds.height - size - y) / size));
  const accents = [ARCHIVE_DUNGEON_TILES.floorWarm, ARCHIVE_DUNGEON_TILES.floorLight, ARCHIVE_DUNGEON_TILES.floorCool];
  const data = Array.from({ length: rows }, (_, row) => Array.from({ length: columns }, (_, col) => {
    const left = x + col * size, top = y + row * size;
    const blocked = solids.some(r => left < r.x + r.width + 1 && left + size > r.x - 1
      && top < r.y + r.height + 1 && top + size > r.y - 1);
    if (blocked) return EMPTY_TILE;
    const seed = row * columns + col;
    return packedTileGid(seed % 11 === 0 ? accents[Math.floor(seed / 11) % accents.length] : ARCHIVE_DUNGEON_TILES.floorBase);
  }));
  return { x, y, data };
}
