import { GAMEPLAY_TILESETS } from "../assets/registry";

export const ARCHIVE_A1_TILEMAP = {
  columns: 16,
  rows: 12,
  x: 0,
  y: 32
} as const;

export const ARCHIVE_DUNGEON_TILES = {
  floorBase: 0,
  floorWarm: 1,
  floorLight: 2,
  floorCool: 5,
  wallDark: 7,
  wallStone: 8,
  wallLight: 9,
  torch: 21
} as const;

export interface ArchiveA1TileLayers {
  ground: number[][];
  walls: number[][];
  decoration: number[][];
  collisionCells: ReadonlyArray<{ tileX: number; tileY: number }>;
}

const EAST_EXIT_ROWS = new Set([4, 5, 6]);
const SOUTH_EXIT_COLUMNS = new Set([7, 8]);
const FLOOR_ACCENTS = [
  { x: 3, y: 2, tile: ARCHIVE_DUNGEON_TILES.floorWarm },
  { x: 12, y: 2, tile: ARCHIVE_DUNGEON_TILES.floorLight },
  { x: 7, y: 5, tile: ARCHIVE_DUNGEON_TILES.floorCool }
] as const;

function emptyLayer() {
  return Array.from(
    { length: ARCHIVE_A1_TILEMAP.rows },
    () => Array<number>(ARCHIVE_A1_TILEMAP.columns).fill(-1)
  );
}

export function isArchiveA1ExitCell(tileX: number, tileY: number) {
  const eastExit = tileX === ARCHIVE_A1_TILEMAP.columns - 1 && EAST_EXIT_ROWS.has(tileY);
  const southExit = tileY === ARCHIVE_A1_TILEMAP.rows - 1 && SOUTH_EXIT_COLUMNS.has(tileX);
  return eastExit || southExit;
}

export function isArchiveA1WallCell(tileX: number, tileY: number) {
  const border = tileX === 0
    || tileX === ARCHIVE_A1_TILEMAP.columns - 1
    || tileY === 0
    || tileY === ARCHIVE_A1_TILEMAP.rows - 1;
  return border && !isArchiveA1ExitCell(tileX, tileY);
}

function wallTile(tileX: number, tileY: number) {
  const corner = (tileX === 0 || tileX === ARCHIVE_A1_TILEMAP.columns - 1)
    && (tileY === 0 || tileY === ARCHIVE_A1_TILEMAP.rows - 1);
  if (corner) return ARCHIVE_DUNGEON_TILES.wallLight;
  return (tileX + tileY) % 3 === 0
    ? ARCHIVE_DUNGEON_TILES.wallDark
    : ARCHIVE_DUNGEON_TILES.wallStone;
}

export function buildArchiveA1TileLayers(): ArchiveA1TileLayers {
  const ground = Array.from(
    { length: ARCHIVE_A1_TILEMAP.rows },
    () => Array<number>(ARCHIVE_A1_TILEMAP.columns).fill(ARCHIVE_DUNGEON_TILES.floorBase)
  );
  const walls = emptyLayer();
  const decoration = emptyLayer();
  const collisionCells: Array<{ tileX: number; tileY: number }> = [];

  for (const accent of FLOOR_ACCENTS) {
    ground[accent.y][accent.x] = accent.tile;
  }

  for (let tileY = 0; tileY < ARCHIVE_A1_TILEMAP.rows; tileY += 1) {
    for (let tileX = 0; tileX < ARCHIVE_A1_TILEMAP.columns; tileX += 1) {
      if (!isArchiveA1WallCell(tileX, tileY)) continue;
      walls[tileY][tileX] = wallTile(tileX, tileY);
      collisionCells.push({ tileX, tileY });
    }
  }

  decoration[0][3] = ARCHIVE_DUNGEON_TILES.torch;
  decoration[0][12] = ARCHIVE_DUNGEON_TILES.torch;

  return { ground, walls, decoration, collisionCells };
}

export function archiveA1CollisionRect(cell: { tileX: number; tileY: number }) {
  const tileSize = GAMEPLAY_TILESETS.archiveDungeonNative.tileSize;
  return {
    x: ARCHIVE_A1_TILEMAP.x + cell.tileX * tileSize,
    y: ARCHIVE_A1_TILEMAP.y + cell.tileY * tileSize,
    width: tileSize,
    height: tileSize
  };
}
