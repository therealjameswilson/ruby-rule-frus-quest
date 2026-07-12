import { describe, expect, it } from "vitest";
import { INTERIOR_TILES } from "./networkN1Tilemap";
import { packedTileGid } from "./packedTileIndex";
import {
  EDITOR_E1_TILEMAP,
  buildEditorE1TileLayers,
  editorE1CollisionRect,
  isEditorE1ExitCell,
  isEditorE1WallCell
} from "./editorE1Tilemap";

describe("Editor's Labyrinth E1 packed tilemap", () => {
  it("builds full-sized ground, wall, and decoration layers", () => {
    const layers = buildEditorE1TileLayers();
    for (const layer of [layers.ground, layers.walls, layers.decoration]) {
      expect(layer).toHaveLength(EDITOR_E1_TILEMAP.rows);
      expect(layer.every((row) => row.length === EDITOR_E1_TILEMAP.columns)).toBe(true);
    }
  });

  it("keeps the east query gate reachable while colliding with the remaining perimeter", () => {
    expect(isEditorE1ExitCell(15, 4)).toBe(true);
    expect(isEditorE1ExitCell(15, 5)).toBe(true);
    expect(isEditorE1ExitCell(15, 6)).toBe(true);
    expect(isEditorE1WallCell(15, 5)).toBe(false);
    expect(isEditorE1WallCell(15, 3)).toBe(true);
    expect(isEditorE1WallCell(0, 5)).toBe(true);
  });

  it("marks the human editor desk and StateChat outbox without blocking either", () => {
    const layers = buildEditorE1TileLayers();
    expect(layers.ground[7][7]).toBe(packedTileGid(INTERIOR_TILES.terminalPad));
    expect(layers.ground[9][7]).toBe(packedTileGid(INTERIOR_TILES.sorterPad));
    expect(layers.collisionCells).not.toContainEqual({ tileX: 7, tileY: 7 });
    expect(layers.collisionCells).not.toContainEqual({ tileX: 7, tileY: 9 });
  });

  it("uses packed one-based gids and returns tile-aligned collision rectangles", () => {
    const layers = buildEditorE1TileLayers();
    const ids = layers.ground.flat().concat(layers.walls.flat(), layers.decoration.flat());
    expect(ids.filter((id) => id >= 0).every((id) => Number.isInteger(id) && id >= 1)).toBe(true);
    expect(editorE1CollisionRect({ tileX: 4, tileY: 8 })).toEqual({
      x: 64,
      y: 160,
      width: 16,
      height: 16
    });
  });
});
