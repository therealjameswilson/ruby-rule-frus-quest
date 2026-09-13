import { describe, expect, it } from "vitest";
import { GAMEPLAY_TILESETS } from "../assets/registry";
import { buildGuideCavernLayers, GUIDE_CAVERN_BOUNDS, GUIDE_CAVERN_ROOM, GUIDE_CAVERN_TILES } from "./guideCavernRoom";
import { EMPTY_TILE, packedTileGid } from "./packedTileIndex";

describe("Guide cavern room", () => {
  it("keeps the player's feet inside the drawn floor on every edge", () => {
    const { x, y, columns, rows } = GUIDE_CAVERN_ROOM;
    const size = GAMEPLAY_TILESETS.archiveDungeonNative.tileSize;
    expect(GUIDE_CAVERN_BOUNDS.left - 8).toBeGreaterThanOrEqual(x + size);
    expect(GUIDE_CAVERN_BOUNDS.right + 8).toBeLessThanOrEqual(x + (columns - 1) * size);
    expect(GUIDE_CAVERN_BOUNDS.top - 3).toBeGreaterThanOrEqual(y + size);
    expect(GUIDE_CAVERN_BOUNDS.bottom + 5).toBeLessThan(y + (rows - 1) * size);
    expect(198 - GUIDE_CAVERN_BOUNDS.bottom).toBeLessThan(32);
  });

  it("uses the 7x7 packed native sheet, four quiet floor fills, and a closed perimeter", () => {
    const { ground, walls, decoration } = buildGuideCavernLayers();
    for (const layer of [ground, walls, decoration]) {
      expect(layer.length).toBe(GUIDE_CAVERN_ROOM.rows);
      for (const row of layer) {
        expect(row.length).toBe(GUIDE_CAVERN_ROOM.columns);
        for (const tile of row) {
          expect(Number.isInteger(tile)).toBe(true);
          expect(tile === EMPTY_TILE || tile > 0 && tile <= 49).toBe(true);
        }
      }
    }
    expect(new Set(ground.flat()).size).toBe(4);
    expect(ground.flat().filter(tile => tile !== packedTileGid(GUIDE_CAVERN_TILES.floor)).length).toBe(4);
    for (let y = 0; y < walls.length; y++) {
      for (let x = 0; x < walls[y].length; x++) {
        const perimeter = x === 0 || y === 0 || x === walls[y].length - 1 || y === walls.length - 1;
        expect(walls[y][x] !== EMPTY_TILE).toBe(perimeter);
      }
    }
  });
});
