import { GAMEPLAY_TILESETS } from "../assets/registry";
import { EMPTY_TILE, packedTileGid } from "./packedTileIndex";

export const NETWORK_N1_TILEMAP = {
  columns: 16,
  rows: 12,
  x: 0,
  y: 32
} as const;

export const INTERIOR_TILES = {
  openNetFloor: 0,
  classNetFloor: 3,
  terminalPad: 5,
  centerLane: 6,
  sorterPad: 7,
  wallPanel: 8,
  wallMetal: 10,
  wallBlue: 14,
  worldMap: 27,
  bulletinBoard: 28
} as const;

export interface NetworkN1TileLayers {
  ground: number[][];
  walls: number[][];
  decoration: number[][];
  collisionCells: ReadonlyArray<{ tileX: number; tileY: number }>;
}

const EAST_EXIT_ROWS = new Set([4, 5, 6]);

function emptyLayer() {
  return Array.from(
    { length: NETWORK_N1_TILEMAP.rows },
    () => Array<number>(NETWORK_N1_TILEMAP.columns).fill(EMPTY_TILE)
  );
}

export function isNetworkN1ExitCell(tileX: number, tileY: number) {
  return tileX === NETWORK_N1_TILEMAP.columns - 1 && EAST_EXIT_ROWS.has(tileY);
}

export function isNetworkN1WallCell(tileX: number, tileY: number) {
  const border = tileX === 0
    || tileX === NETWORK_N1_TILEMAP.columns - 1
    || tileY === 0
    || tileY === NETWORK_N1_TILEMAP.rows - 1;
  return border && !isNetworkN1ExitCell(tileX, tileY);
}

function groundTile(tileX: number) {
  if (tileX === 7 || tileX === 8) return INTERIOR_TILES.centerLane;
  return tileX < 7 ? INTERIOR_TILES.openNetFloor : INTERIOR_TILES.classNetFloor;
}

function wallTile(tileX: number, tileY: number) {
  const corner = (tileX === 0 || tileX === NETWORK_N1_TILEMAP.columns - 1)
    && (tileY === 0 || tileY === NETWORK_N1_TILEMAP.rows - 1);
  if (corner) return INTERIOR_TILES.wallPanel;
  if (tileY === 0) return tileX < 8 ? INTERIOR_TILES.wallBlue : INTERIOR_TILES.wallMetal;
  return (tileX + tileY) % 3 === 0 ? INTERIOR_TILES.wallBlue : INTERIOR_TILES.wallMetal;
}

export function buildNetworkN1TileLayers(): NetworkN1TileLayers {
  const ground: number[][] = Array.from(
    { length: NETWORK_N1_TILEMAP.rows },
    () => Array.from({ length: NETWORK_N1_TILEMAP.columns }, (_, tileX) => packedTileGid(groundTile(tileX)))
  );
  const walls = emptyLayer();
  const decoration = emptyLayer();
  const collisionCells: Array<{ tileX: number; tileY: number }> = [];

  for (let tileY = 0; tileY < NETWORK_N1_TILEMAP.rows; tileY += 1) {
    for (let tileX = 0; tileX < NETWORK_N1_TILEMAP.columns; tileX += 1) {
      if (!isNetworkN1WallCell(tileX, tileY)) continue;
      walls[tileY][tileX] = packedTileGid(wallTile(tileX, tileY));
      collisionCells.push({ tileX, tileY });
    }
  }

  for (const tileY of [5, 6]) {
    for (const tileX of [3, 4, 11, 12]) {
      ground[tileY][tileX] = packedTileGid(INTERIOR_TILES.terminalPad);
    }
  }
  ground[9][7] = packedTileGid(INTERIOR_TILES.sorterPad);
  ground[9][8] = packedTileGid(INTERIOR_TILES.sorterPad);
  decoration[0][7] = packedTileGid(INTERIOR_TILES.worldMap);
  decoration[0][8] = packedTileGid(INTERIOR_TILES.bulletinBoard);

  return { ground, walls, decoration, collisionCells };
}

export function networkN1CollisionRect(cell: { tileX: number; tileY: number }) {
  const tileSize = GAMEPLAY_TILESETS.interiorsNative.tileSize;
  return {
    x: NETWORK_N1_TILEMAP.x + cell.tileX * tileSize,
    y: NETWORK_N1_TILEMAP.y + cell.tileY * tileSize,
    width: tileSize,
    height: tileSize
  };
}
