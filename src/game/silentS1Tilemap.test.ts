import { describe, expect, it } from "vitest";
import { INTERIOR_TILES } from "./networkN1Tilemap";
import { packedTileGid } from "./packedTileIndex";
import {
  SILENT_S1_TILEMAP,
  buildSilentS1TileLayers,
  isSilentS1ExitCell,
  isSilentS1WallCell,
  silentS1CollisionRect
} from "./silentS1Tilemap";

describe("Silent Read S1 packed tilemap", () => {
  it("builds full-sized ground, wall, and decoration layers", () => {
    const layers = buildSilentS1TileLayers();
    for (const layer of [layers.ground, layers.walls, layers.decoration]) {
      expect(layer).toHaveLength(SILENT_S1_TILEMAP.rows);
      expect(layer.every((row) => row.length === SILENT_S1_TILEMAP.columns)).toBe(true);
    }
  });

  it("keeps the E1 return and Black Vault gate reachable", () => {
    for (const tileX of [0, 15]) {
      expect(isSilentS1ExitCell(tileX, 4)).toBe(true);
      expect(isSilentS1ExitCell(tileX, 5)).toBe(true);
      expect(isSilentS1ExitCell(tileX, 6)).toBe(true);
      expect(isSilentS1WallCell(tileX, 5)).toBe(false);
      expect(isSilentS1WallCell(tileX, 3)).toBe(true);
    }
  });

  it("marks every evidence and publication workstation plus the outbox", () => {
    const layers = buildSilentS1TileLayers();
    const terminalPad = packedTileGid(INTERIOR_TILES.terminalPad);
    const deskPad = packedTileGid(INTERIOR_TILES.sorterPad);

    expect(layers.ground[8][2]).toBe(terminalPad);
    expect(layers.ground[8][12]).toBe(terminalPad);
    expect(layers.ground[6][3]).toBe(deskPad);
    expect(layers.ground[6][7]).toBe(deskPad);
    expect(layers.ground[6][11]).toBe(deskPad);
    expect(layers.ground[9][7]).toBe(terminalPad);
  });

  it("uses packed one-based gids and returns tile-aligned collision rectangles", () => {
    const layers = buildSilentS1TileLayers();
    const ids = layers.ground.flat().concat(layers.walls.flat(), layers.decoration.flat());
    expect(ids.filter((id) => id >= 0).every((id) => Number.isInteger(id) && id >= 1)).toBe(true);
    expect(silentS1CollisionRect({ tileX: 10, tileY: 7 })).toEqual({
      x: 160,
      y: 144,
      width: 16,
      height: 16
    });
  });
});
