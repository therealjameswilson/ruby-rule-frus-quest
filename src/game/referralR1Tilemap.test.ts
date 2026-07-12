import { describe, expect, it } from "vitest";
import { INTERIOR_TILES } from "./networkN1Tilemap";
import { packedTileGid } from "./packedTileIndex";
import {
  REFERRAL_R1_TILEMAP,
  buildReferralR1TileLayers,
  isReferralR1ExitCell,
  isReferralR1WallCell,
  referralR1CollisionRect
} from "./referralR1Tilemap";

describe("Referral R1 packed tilemap", () => {
  it("builds full-sized ground, wall, and decoration layers", () => {
    const layers = buildReferralR1TileLayers();
    for (const layer of [layers.ground, layers.walls, layers.decoration]) {
      expect(layer).toHaveLength(REFERRAL_R1_TILEMAP.rows);
      expect(layer.every((row) => row.length === REFERRAL_R1_TILEMAP.columns)).toBe(true);
    }
  });

  it("keeps the east transition open while colliding with the remaining perimeter", () => {
    expect(isReferralR1ExitCell(15, 4)).toBe(true);
    expect(isReferralR1ExitCell(15, 5)).toBe(true);
    expect(isReferralR1ExitCell(15, 6)).toBe(true);
    expect(isReferralR1WallCell(15, 5)).toBe(false);
    expect(isReferralR1WallCell(15, 3)).toBe(true);
    expect(isReferralR1WallCell(0, 5)).toBe(true);
  });

  it("marks three agency pads and the intake tray without blocking them", () => {
    const layers = buildReferralR1TileLayers();
    const agencyPad = packedTileGid(INTERIOR_TILES.terminalPad);
    const intakePad = packedTileGid(INTERIOR_TILES.sorterPad);

    expect(layers.ground[5][3]).toBe(agencyPad);
    expect(layers.ground[5][7]).toBe(agencyPad);
    expect(layers.ground[5][11]).toBe(agencyPad);
    expect(layers.ground[8][7]).toBe(intakePad);
    expect(layers.collisionCells).not.toContainEqual({ tileX: 3, tileY: 5 });
    expect(layers.collisionCells).not.toContainEqual({ tileX: 7, tileY: 8 });
  });

  it("uses packed one-based gids and returns tile-aligned collision rectangles", () => {
    const layers = buildReferralR1TileLayers();
    const ids = layers.ground.flat().concat(layers.walls.flat(), layers.decoration.flat());
    expect(ids.filter((id) => id >= 0).every((id) => Number.isInteger(id) && id >= 1)).toBe(true);
    expect(referralR1CollisionRect({ tileX: 2, tileY: 3 })).toEqual({
      x: 32,
      y: 80,
      width: 16,
      height: 16
    });
  });
});
