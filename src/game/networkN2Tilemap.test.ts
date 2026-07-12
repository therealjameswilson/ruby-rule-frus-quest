import { describe, expect, it } from "vitest";
import { GAMEPLAY_TILESETS } from "../assets/registry";
import { INTERIOR_TILES } from "./networkN1Tilemap";
import {
  NETWORK_N2_TILEMAP,
  buildNetworkN2TileLayers,
  isNetworkN2ExitCell,
  isNetworkN2WallCell,
  networkN2CollisionRect
} from "./networkN2Tilemap";
import { packedTileGid } from "./packedTileIndex";

describe("Network N2 packed tilemap", () => {
  it("builds valid 16x12 ground, wall, and decoration layers", () => {
    const layers = buildNetworkN2TileLayers();
    const maxGid = GAMEPLAY_TILESETS.interiorsNative.columns
      * GAMEPLAY_TILESETS.interiorsNative.rows;

    for (const layer of [layers.ground, layers.walls, layers.decoration]) {
      expect(layer).toHaveLength(NETWORK_N2_TILEMAP.rows);
      expect(layer.every((row) => row.length === NETWORK_N2_TILEMAP.columns)).toBe(true);
      expect(layer.flat().every((index) => index >= -1 && index <= maxGid)).toBe(true);
    }
    expect(layers.ground.flat().every((index) => index >= 1)).toBe(true);
    expect(new Set(layers.ground.flat()).size).toBeGreaterThanOrEqual(6);
  });

  it("marks distinct physical pads for the three review stations and token pedestal", () => {
    const { ground } = buildNetworkN2TileLayers();
    expect(ground[8][3]).toBe(packedTileGid(INTERIOR_TILES.terminalPad));
    expect(ground[8][11]).toBe(packedTileGid(INTERIOR_TILES.terminalPad));
    expect(ground[2][7]).toBe(packedTileGid(INTERIOR_TILES.sorterPad));
    expect(ground[5][7]).toBe(packedTileGid(INTERIOR_TILES.centerLane));
    expect(ground[4][7]).toBe(packedTileGid(INTERIOR_TILES.redCarpetFloor));
  });

  it("keeps both side exits open and collides with every other perimeter tile", () => {
    const layers = buildNetworkN2TileLayers();
    const collisionKeys = new Set(layers.collisionCells.map((cell) => `${cell.tileX},${cell.tileY}`));

    for (let tileY = 0; tileY < NETWORK_N2_TILEMAP.rows; tileY += 1) {
      for (let tileX = 0; tileX < NETWORK_N2_TILEMAP.columns; tileX += 1) {
        expect(collisionKeys.has(`${tileX},${tileY}`)).toBe(isNetworkN2WallCell(tileX, tileY));
      }
    }
    for (const tileY of [4, 5, 6]) {
      expect(isNetworkN2ExitCell(0, tileY)).toBe(true);
      expect(isNetworkN2ExitCell(15, tileY)).toBe(true);
      expect(collisionKeys.has(`0,${tileY}`)).toBe(false);
      expect(collisionKeys.has(`15,${tileY}`)).toBe(false);
    }
    expect(collisionKeys.has("7,0")).toBe(true);
    expect(collisionKeys.has("7,11")).toBe(true);
  });

  it("converts tile collision to integer world-space rectangles", () => {
    expect(networkN2CollisionRect({ tileX: 12, tileY: 3 })).toEqual({
      x: 192,
      y: 80,
      width: 16,
      height: 16
    });
  });
});
