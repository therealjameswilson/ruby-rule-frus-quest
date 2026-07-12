import { GAMEPLAY_TILESETS } from "../assets/registry";
import { INTERIOR_TILES } from "./networkN1Tilemap";
import { EMPTY_TILE, packedTileGid } from "./packedTileIndex";

export const SILENT_S1_TILEMAP = {
  columns: 16,
  rows: 12,
  x: 0,
  y: 32
} as const;

export interface SilentS1TileLayers {
  ground: number[][];
  walls: number[][];
  decoration: number[][];
  collisionCells: ReadonlyArray<{ tileX: number; tileY: number }>;
}

const EXIT_ROWS = new Set([4, 5, 6]);

function emptyLayer() {
  return Array.from(
    { length: SILENT_S1_TILEMAP.rows },
    () => Array<number>(SILENT_S1_TILEMAP.columns).fill(EMPTY_TILE)
  );
}

export function isSilentS1ExitCell(tileX: number, tileY: number) {
  const side = tileX === 0 || tileX === SILENT_S1_TILEMAP.columns - 1;
  return side && EXIT_ROWS.has(tileY);
}

export function isSilentS1WallCell(tileX: number, tileY: number) {
  const border = tileX === 0
    || tileX === SILENT_S1_TILEMAP.columns - 1
    || tileY === 0
    || tileY === SILENT_S1_TILEMAP.rows - 1;
  return border && !isSilentS1ExitCell(tileX, tileY);
}

function wallTile(tileX: number, tileY: number) {
  const corner = (tileX === 0 || tileX === SILENT_S1_TILEMAP.columns - 1)
    && (tileY === 0 || tileY === SILENT_S1_TILEMAP.rows - 1);
  if (corner) return INTERIOR_TILES.wallPanel;
  if (tileY === 0 || tileY === SILENT_S1_TILEMAP.rows - 1) {
    return tileX % 4 === 0 ? INTERIOR_TILES.wallBrick : INTERIOR_TILES.wallMetal;
  }
  return tileY % 3 === 0 ? INTERIOR_TILES.wallBlue : INTERIOR_TILES.wallPanel;
}

function fillRect(layer: number[][], x: number, y: number, width: number, height: number, sourceIndex: number) {
  for (let tileY = y; tileY < y + height; tileY += 1) {
    for (let tileX = x; tileX < x + width; tileX += 1) {
      layer[tileY][tileX] = packedTileGid(sourceIndex);
    }
  }
}

export function buildSilentS1TileLayers(): SilentS1TileLayers {
  const ground: number[][] = Array.from(
    { length: SILENT_S1_TILEMAP.rows },
    () => Array<number>(SILENT_S1_TILEMAP.columns).fill(packedTileGid(INTERIOR_TILES.darkWoodAltFloor))
  );
  const walls = emptyLayer();
  const decoration = emptyLayer();
  const collisionCells: Array<{ tileX: number; tileY: number }> = [];

  fillRect(ground, 7, 0, 2, SILENT_S1_TILEMAP.rows, INTERIOR_TILES.centerLane);
  fillRect(ground, 2, 8, 2, 2, INTERIOR_TILES.terminalPad);
  fillRect(ground, 12, 8, 2, 2, INTERIOR_TILES.terminalPad);
  fillRect(ground, 3, 6, 2, 2, INTERIOR_TILES.sorterPad);
  fillRect(ground, 7, 6, 2, 2, INTERIOR_TILES.sorterPad);
  fillRect(ground, 11, 6, 2, 2, INTERIOR_TILES.sorterPad);
  fillRect(ground, 7, 9, 2, 2, INTERIOR_TILES.terminalPad);

  for (let tileY = 0; tileY < SILENT_S1_TILEMAP.rows; tileY += 1) {
    for (let tileX = 0; tileX < SILENT_S1_TILEMAP.columns; tileX += 1) {
      if (!isSilentS1WallCell(tileX, tileY)) continue;
      walls[tileY][tileX] = packedTileGid(wallTile(tileX, tileY));
      collisionCells.push({ tileX, tileY });
    }
  }

  decoration[0][7] = packedTileGid(INTERIOR_TILES.bulletinBoard);
  decoration[0][8] = packedTileGid(INTERIOR_TILES.safe);

  return { ground, walls, decoration, collisionCells };
}

export function silentS1CollisionRect(cell: { tileX: number; tileY: number }) {
  const tileSize = GAMEPLAY_TILESETS.interiorsNative.tileSize;
  return {
    x: SILENT_S1_TILEMAP.x + cell.tileX * tileSize,
    y: SILENT_S1_TILEMAP.y + cell.tileY * tileSize,
    width: tileSize,
    height: tileSize
  };
}
