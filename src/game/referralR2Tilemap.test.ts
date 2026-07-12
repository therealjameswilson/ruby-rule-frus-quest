import { describe, expect, it } from "vitest";
import { INTERIOR_TILES } from "./networkN1Tilemap";
import { packedTileGid } from "./packedTileIndex";
import {
  REFERRAL_R2_TILEMAP,
  buildReferralR2TileLayers,
  isReferralR2ExitCell,
  isReferralR2WallCell,
  referralR2CollisionRect
} from "./referralR2Tilemap";

describe("Referral R2 packed tilemap", () => {
  it("builds full-sized ground, wall, and decoration layers", () => {
    const layers = buildReferralR2TileLayers();
    for (const layer of [layers.ground, layers.walls, layers.decoration]) {
      expect(layer).toHaveLength(REFERRAL_R2_TILEMAP.rows);
      expect(layer.every((row) => row.length === REFERRAL_R2_TILEMAP.columns)).toBe(true);
    }
  });

  it("keeps west and east transitions open while colliding with the remaining perimeter", () => {
    for (const tileX of [0, 15]) {
      expect(isReferralR2ExitCell(tileX, 4)).toBe(true);
      expect(isReferralR2ExitCell(tileX, 5)).toBe(true);
      expect(isReferralR2ExitCell(tileX, 6)).toBe(true);
      expect(isReferralR2WallCell(tileX, 5)).toBe(false);
      expect(isReferralR2WallCell(tileX, 3)).toBe(true);
    }
  });

  it("marks the reward pedestal and five resolved-equity floor cues without blocking them", () => {
    const layers = buildReferralR2TileLayers();
    expect(layers.ground[5][7]).toBe(packedTileGid(INTERIOR_TILES.sorterPad));
    for (const tileX of [3, 5, 7, 9, 11]) {
      expect(layers.ground[3][tileX]).toBe(packedTileGid(INTERIOR_TILES.terminalPad));
      expect(layers.collisionCells).not.toContainEqual({ tileX, tileY: 3 });
    }
  });

  it("uses packed one-based gids and returns tile-aligned collision rectangles", () => {
    const layers = buildReferralR2TileLayers();
    const ids = layers.ground.flat().concat(layers.walls.flat(), layers.decoration.flat());
    expect(ids.filter((id) => id >= 0).every((id) => Number.isInteger(id) && id >= 1)).toBe(true);
    expect(referralR2CollisionRect({ tileX: 12, tileY: 9 })).toEqual({
      x: 192,
      y: 176,
      width: 16,
      height: 16
    });
  });
});
