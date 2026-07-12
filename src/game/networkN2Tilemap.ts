import { GAMEPLAY_TILESETS } from "../assets/registry";
import { INTERIOR_TILES } from "./networkN1Tilemap";
import { EMPTY_TILE, packedTileGid } from "./packedTileIndex";

export const NETWORK_N2_TILEMAP = {
  columns: 16,
  rows: 12,
  x: 0,
  y: 32
} as const;

export interface NetworkN2TileLayers {
  ground: number[][];
  walls: number[][];
  decoration: number[][];
  collisionCells: ReadonlyArray<{ tileX: number; tileY: number }>;
}

const EXIT_ROWS = new Set([4, 5, 6]);

function emptyLayer() {
  return Array.from(
    { length: NETWORK_N2_TILEMAP.rows },
    () => Array<number>(NETWORK_N2_TILEMAP.columns).fill(EMPTY_TILE)
  );
}

export function isNetworkN2ExitCell(tileX: number, tileY: number) {
  const side = tileX === 0 || tileX === NETWORK_N2_TILEMAP.columns - 1;
  return side && EXIT_ROWS.has(tileY);
}

export function isNetworkN2WallCell(tileX: number, tileY: number) {
  const border = tileX === 0
    || tileX === NETWORK_N2_TILEMAP.columns - 1
    || tileY === 0
    || tileY === NETWORK_N2_TILEMAP.rows - 1;
  return border && !isNetworkN2ExitCell(tileX, tileY);
}

function wallTile(tileX: number, tileY: number) {
  const corner = (tileX === 0 || tileX === NETWORK_N2_TILEMAP.columns - 1)
    && (tileY === 0 || tileY === NETWORK_N2_TILEMAP.rows - 1);
  if (corner) return INTERIOR_TILES.wallPanel;
  if (tileY === 0 || tileY === NETWORK_N2_TILEMAP.rows - 1) {
    return tileX % 4 === 0 ? INTERIOR_TILES.wallBrick : INTERIOR_TILES.wallMetal;
  }
  return INTERIOR_TILES.wallBlue;
}

function fillRect(layer: number[][], x: number, y: number, width: number, height: number, sourceIndex: number) {
  for (let tileY = y; tileY < y + height; tileY += 1) {
    for (let tileX = x; tileX < x + width; tileX += 1) {
      layer[tileY][tileX] = packedTileGid(sourceIndex);
    }
  }
}

export function buildNetworkN2TileLayers(): NetworkN2TileLayers {
  const ground: number[][] = Array.from(
    { length: NETWORK_N2_TILEMAP.rows },
    () => Array<number>(NETWORK_N2_TILEMAP.columns).fill(packedTileGid(INTERIOR_TILES.classNetFloor))
  );
  const walls = emptyLayer();
  const decoration = emptyLayer();
  const collisionCells: Array<{ tileX: number; tileY: number }> = [];

  fillRect(ground, 0, 0, 3, NETWORK_N2_TILEMAP.rows, INTERIOR_TILES.darkWoodAltFloor);
  fillRect(ground, 13, 0, 3, NETWORK_N2_TILEMAP.rows, INTERIOR_TILES.darkWoodAltFloor);
  fillRect(ground, 7, 0, 2, NETWORK_N2_TILEMAP.rows, INTERIOR_TILES.redCarpetFloor);
  fillRect(ground, 3, 8, 2, 2, INTERIOR_TILES.terminalPad);
  fillRect(ground, 11, 8, 2, 2, INTERIOR_TILES.terminalPad);
  fillRect(ground, 7, 2, 2, 2, INTERIOR_TILES.sorterPad);
  fillRect(ground, 7, 5, 2, 2, INTERIOR_TILES.centerLane);

  for (let tileY = 0; tileY < NETWORK_N2_TILEMAP.rows; tileY += 1) {
    for (let tileX = 0; tileX < NETWORK_N2_TILEMAP.columns; tileX += 1) {
      if (!isNetworkN2WallCell(tileX, tileY)) continue;
      walls[tileY][tileX] = packedTileGid(wallTile(tileX, tileY));
      collisionCells.push({ tileX, tileY });
    }
  }

  decoration[0][3] = packedTileGid(INTERIOR_TILES.safe);
  decoration[0][12] = packedTileGid(INTERIOR_TILES.safe);
  decoration[0][7] = packedTileGid(INTERIOR_TILES.bulletinBoard);

  return { ground, walls, decoration, collisionCells };
}

export function networkN2CollisionRect(cell: { tileX: number; tileY: number }) {
  const tileSize = GAMEPLAY_TILESETS.interiorsNative.tileSize;
  return {
    x: NETWORK_N2_TILEMAP.x + cell.tileX * tileSize,
    y: NETWORK_N2_TILEMAP.y + cell.tileY * tileSize,
    width: tileSize,
    height: tileSize
  };
}
