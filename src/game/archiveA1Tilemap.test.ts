import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { GAMEPLAY_TILESETS } from "../assets/registry";
import {
  ARCHIVE_A1_TILEMAP,
  archiveA1CollisionRect,
  buildArchiveA1TileLayers,
  isArchiveA1ExitCell,
  isArchiveA1WallCell
} from "./archiveA1Tilemap";
import { packedTileGid } from "./packedTileIndex";

describe("Archive A1 packed tilemap", () => {
  it("keeps the typed native tileset registry aligned with the art-pack manifest", () => {
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
    const registry = GAMEPLAY_TILESETS.archiveDungeonNative;
    const entry = manifest.tilesets[registry.manifestKey];

    expect(entry).toBeDefined();
    expect(registry.path).toBe(entry.nativePath);
    expect(registry.columns).toBe(entry.columns);
    expect(registry.rows).toBe(entry.rows);
    expect(registry.tileSize).toBe(entry.nativeTileSize);
    expect(registry.imageWidth).toBe(entry.nativeImageWidth);
    expect(registry.imageHeight).toBe(entry.nativeImageHeight);
  });

  it("builds three 16x12 layers using valid archive-dungeon indices", () => {
    const layers = buildArchiveA1TileLayers();
    const maxGid = GAMEPLAY_TILESETS.archiveDungeonNative.columns
      * GAMEPLAY_TILESETS.archiveDungeonNative.rows;

    for (const layer of [layers.ground, layers.walls, layers.decoration]) {
      expect(layer).toHaveLength(ARCHIVE_A1_TILEMAP.rows);
      expect(layer.every((row) => row.length === ARCHIVE_A1_TILEMAP.columns)).toBe(true);
      expect(layer.flat().every((index) => index >= -1 && index <= maxGid)).toBe(true);
    }
    expect(layers.ground.flat().every((index) => index >= 1)).toBe(true);
    expect(new Set(layers.ground.flat()).size).toBeGreaterThanOrEqual(4);
    expect(layers.ground[1][1]).toBe(packedTileGid(0));
  });

  it("keeps east and south exits open while deriving collision from every other border tile", () => {
    const layers = buildArchiveA1TileLayers();
    const collisionKeys = new Set(layers.collisionCells.map((cell) => `${cell.tileX},${cell.tileY}`));

    for (let tileY = 0; tileY < ARCHIVE_A1_TILEMAP.rows; tileY += 1) {
      for (let tileX = 0; tileX < ARCHIVE_A1_TILEMAP.columns; tileX += 1) {
        expect(collisionKeys.has(`${tileX},${tileY}`)).toBe(isArchiveA1WallCell(tileX, tileY));
      }
    }

    for (const tileY of [4, 5, 6]) {
      expect(isArchiveA1ExitCell(15, tileY)).toBe(true);
      expect(collisionKeys.has(`15,${tileY}`)).toBe(false);
    }
    for (const tileX of [7, 8]) {
      expect(isArchiveA1ExitCell(tileX, 11)).toBe(true);
      expect(collisionKeys.has(`${tileX},11`)).toBe(false);
    }
    expect(collisionKeys.has("7,0")).toBe(true);
    expect(collisionKeys.has("0,5")).toBe(true);
  });

  it("converts collision cells to integer world-space tile rectangles", () => {
    expect(archiveA1CollisionRect({ tileX: 2, tileY: 3 })).toEqual({
      x: 32,
      y: 80,
      width: 16,
      height: 16
    });
  });
});
