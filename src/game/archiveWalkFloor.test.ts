import { describe, expect, it } from "vitest";
import { archiveWalkFloor } from "./archiveWalkFloor";
import { EMPTY_TILE, packedTileGid } from "./packedTileIndex";
import { ARCHIVE_DUNGEON_TILES } from "./archiveA1Tilemap";

describe("archive walkable floor dressing", () => {
  const bounds = { x: 0, y: 28, width: 256, height: 180 };
  it("preserves the map border and uses integer native tile coordinates", () => {
    const floor = archiveWalkFloor(bounds, []);
    expect(floor.x % 16).toBe(0);
    expect(floor.y % 16).toBe(0);
    expect(floor.x).toBeGreaterThanOrEqual(bounds.x + 16);
    expect(floor.y).toBeGreaterThanOrEqual(bounds.y + 16);
    expect(floor.x + floor.data[0].length * 16).toBeLessThanOrEqual(bounds.x + bounds.width - 16);
    expect(floor.y + floor.data.length * 16).toBeLessThanOrEqual(bounds.y + bounds.height - 16);
  });
  it("never covers a blocker or its one-pixel silhouette", () => {
    const solids = [{ x: 56, y: 72, width: 32, height: 19 }];
    const before = JSON.stringify(solids);
    const floor = archiveWalkFloor(bounds, solids);
    floor.data.forEach((row, r) => row.forEach((tile, c) => {
      const x = floor.x + c * 16, y = floor.y + r * 16;
      const overlap = x < 89 && x + 16 > 55 && y < 92 && y + 16 > 71;
      expect(tile === EMPTY_TILE).toBe(overlap);
    }));
    expect(JSON.stringify(solids)).toBe(before);
  });
  it("uses four existing floor frames with sparse deterministic accents", () => {
    const floor = archiveWalkFloor(bounds, []);
    expect(archiveWalkFloor(bounds, [])).toEqual(floor);
    expect(new Set(floor.data.flat())).toEqual(new Set([
      ARCHIVE_DUNGEON_TILES.floorBase, ARCHIVE_DUNGEON_TILES.floorWarm,
      ARCHIVE_DUNGEON_TILES.floorLight, ARCHIVE_DUNGEON_TILES.floorCool
    ].map(packedTileGid)));
    expect(floor.data.flat().filter(t => t === packedTileGid(ARCHIVE_DUNGEON_TILES.floorBase)).length / floor.data.flat().length).toBeGreaterThan(0.85);
  });
});
