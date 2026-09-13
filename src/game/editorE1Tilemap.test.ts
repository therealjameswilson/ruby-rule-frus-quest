import { describe, expect, it } from "vitest";
import { INTERIOR_TILES } from "./networkN1Tilemap";
import { packedTileGid } from "./packedTileIndex";
import {
  EDITOR_E1_TILEMAP,
  EDITOR_DRAFT_OUTBOX,
  EDITOR_DESK_POSITION,
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
    for (const tileY of [4, 5, 6]) {
      expect(isEditorE1ExitCell(0, tileY)).toBe(true);
      expect(isEditorE1WallCell(0, tileY)).toBe(false);
    }
    expect(isEditorE1WallCell(0, 3)).toBe(true);
  });

  it("marks the human editor desk and StateChat outbox without blocking either", () => {
    const layers = buildEditorE1TileLayers();
    expect(layers.ground[7][7]).toBe(packedTileGid(INTERIOR_TILES.terminalPad));
    expect(layers.ground[9][3]).toBe(packedTileGid(INTERIOR_TILES.sorterPad));
    expect(layers.collisionCells).not.toContainEqual({ tileX: 7, tileY: 7 });
    expect(layers.collisionCells).not.toContainEqual({ tileX: 3, tileY: 9 });
  });

  it("separates the draft pickup and desk without changing the door corridors", () => {
    const pickup = { x: EDITOR_DRAFT_OUTBOX.x, y: EDITOR_DRAFT_OUTBOX.y - 10 };
    const { x, y } = EDITOR_DESK_POSITION;
    expect(Math.hypot(pickup.x - x, pickup.y - y)).toBeGreaterThan(24 + 40);
    const solids = buildEditorE1TileLayers().collisionCells.map(editorE1CollisionRect);
    const stops = [{ x: 30, y: 124 }, { x: 30, y: 202 }, { x: pickup.x, y: 202 }, { x, y: 185 }, { x: 226, y: 185 }, { x: 226, y: 124 }];
    for (const stop of stops) {
      expect(solids.some(rect => stop.x + 8 >= rect.x && stop.x - 8 <= rect.x + rect.width
        && stop.y + 5 >= rect.y && stop.y - 3 <= rect.y + rect.height)).toBe(false);
    }
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
