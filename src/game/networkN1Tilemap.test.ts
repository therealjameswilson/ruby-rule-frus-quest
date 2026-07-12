import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { GAMEPLAY_TILESETS } from "../assets/registry";
import {
  INTERIOR_TILES,
  NETWORK_N1_TILEMAP,
  buildNetworkN1TileLayers,
  isNetworkN1ExitCell,
  isNetworkN1WallCell,
  networkN1CollisionRect
} from "./networkN1Tilemap";
import { packedTileGid } from "./packedTileIndex";

describe("Network N1 packed tilemap", () => {
  it("keeps the typed native interiors registry aligned with the art-pack manifest", () => {
    const manifestPath = resolve(process.cwd(), "public/assets/art-pack/manifest.json");
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
      tilesets: Record<string, {
        nativePath: string;
        columns: number;
        rows: number;
        nativeTileSize: number;
        nativeImageWidth: number;
        nativeImageHeight: number;
      }>;
    };
    const registry = GAMEPLAY_TILESETS.interiorsNative;
    const entry = manifest.tilesets[registry.manifestKey];

    expect(entry).toBeDefined();
    expect(registry.path).toBe(entry.nativePath);
    expect(registry.columns).toBe(entry.columns);
    expect(registry.rows).toBe(entry.rows);
    expect(registry.tileSize).toBe(entry.nativeTileSize);
    expect(registry.imageWidth).toBe(entry.nativeImageWidth);
    expect(registry.imageHeight).toBe(entry.nativeImageHeight);
  });

  it("builds valid 16x12 ground, wall, and decoration layers", () => {
    const layers = buildNetworkN1TileLayers();
    const maxGid = GAMEPLAY_TILESETS.interiorsNative.columns
      * GAMEPLAY_TILESETS.interiorsNative.rows;

    for (const layer of [layers.ground, layers.walls, layers.decoration]) {
      expect(layer).toHaveLength(NETWORK_N1_TILEMAP.rows);
      expect(layer.every((row) => row.length === NETWORK_N1_TILEMAP.columns)).toBe(true);
      expect(layer.flat().every((index) => index >= -1 && index <= maxGid)).toBe(true);
    }
    expect(layers.ground.flat().every((index) => index >= 1)).toBe(true);
    expect(new Set(layers.ground.flat()).size).toBeGreaterThanOrEqual(5);
  });

  it("uses distinct readable zones for OpenNet, ClassNet, terminals, and sorter", () => {
    const { ground } = buildNetworkN1TileLayers();
    expect(ground[4][2]).toBe(packedTileGid(INTERIOR_TILES.openNetFloor));
    expect(ground[4][13]).toBe(packedTileGid(INTERIOR_TILES.classNetFloor));
    expect(ground[4][7]).toBe(packedTileGid(INTERIOR_TILES.centerLane));
    expect(ground[5][3]).toBe(packedTileGid(INTERIOR_TILES.terminalPad));
    expect(ground[5][12]).toBe(packedTileGid(INTERIOR_TILES.terminalPad));
    expect(ground[9][7]).toBe(packedTileGid(INTERIOR_TILES.sorterPad));
  });

  it("keeps only the east doorway open and derives collision from the remaining border", () => {
    const layers = buildNetworkN1TileLayers();
    const collisionKeys = new Set(layers.collisionCells.map((cell) => `${cell.tileX},${cell.tileY}`));

    for (let tileY = 0; tileY < NETWORK_N1_TILEMAP.rows; tileY += 1) {
      for (let tileX = 0; tileX < NETWORK_N1_TILEMAP.columns; tileX += 1) {
        expect(collisionKeys.has(`${tileX},${tileY}`)).toBe(isNetworkN1WallCell(tileX, tileY));
      }
    }
    for (const tileY of [4, 5, 6]) {
      expect(isNetworkN1ExitCell(15, tileY)).toBe(true);
      expect(collisionKeys.has(`15,${tileY}`)).toBe(false);
    }
    expect(collisionKeys.has("0,5")).toBe(true);
    expect(collisionKeys.has("7,0")).toBe(true);
    expect(collisionKeys.has("7,11")).toBe(true);
  });

  it("converts tile collision to integer world-space rectangles", () => {
    expect(networkN1CollisionRect({ tileX: 4, tileY: 6 })).toEqual({
      x: 64,
      y: 128,
      width: 16,
      height: 16
    });
  });
});
