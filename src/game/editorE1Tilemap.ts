import { GAMEPLAY_TILESETS } from "../assets/registry";
import { INTERIOR_TILES } from "./networkN1Tilemap";
import { EMPTY_TILE, packedTileGid } from "./packedTileIndex";

export const EDITOR_E1_TILEMAP = {
  columns: 16,
  rows: 12,
  x: 0,
  y: 32
} as const;

export interface EditorE1TileLayers {
  ground: number[][];
  walls: number[][];
  decoration: number[][];
  collisionCells: ReadonlyArray<{ tileX: number; tileY: number }>;
}

const EAST_EXIT_ROWS = new Set([4, 5, 6]);

function emptyLayer() {
  return Array.from(
    { length: EDITOR_E1_TILEMAP.rows },
    () => Array<number>(EDITOR_E1_TILEMAP.columns).fill(EMPTY_TILE)
  );
}

export function isEditorE1ExitCell(tileX: number, tileY: number) {
  return tileX === EDITOR_E1_TILEMAP.columns - 1 && EAST_EXIT_ROWS.has(tileY);
}

export function isEditorE1WallCell(tileX: number, tileY: number) {
  const border = tileX === 0
    || tileX === EDITOR_E1_TILEMAP.columns - 1
    || tileY === 0
    || tileY === EDITOR_E1_TILEMAP.rows - 1;
  return border && !isEditorE1ExitCell(tileX, tileY);
}

function wallTile(tileX: number, tileY: number) {
  const corner = (tileX === 0 || tileX === EDITOR_E1_TILEMAP.columns - 1)
    && (tileY === 0 || tileY === EDITOR_E1_TILEMAP.rows - 1);
  if (corner) return INTERIOR_TILES.wallPanel;
  if (tileY === 0 || tileY === EDITOR_E1_TILEMAP.rows - 1) {
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

export function buildEditorE1TileLayers(): EditorE1TileLayers {
  const ground: number[][] = Array.from(
    { length: EDITOR_E1_TILEMAP.rows },
    () => Array<number>(EDITOR_E1_TILEMAP.columns).fill(packedTileGid(INTERIOR_TILES.openNetFloor))
  );
  const walls = emptyLayer();
  const decoration = emptyLayer();
  const collisionCells: Array<{ tileX: number; tileY: number }> = [];

  fillRect(ground, 7, 0, 2, EDITOR_E1_TILEMAP.rows, INTERIOR_TILES.redCarpetFloor);
  fillRect(ground, 7, 7, 2, 2, INTERIOR_TILES.terminalPad);
  fillRect(ground, 7, 9, 2, 2, INTERIOR_TILES.sorterPad);

  for (let tileY = 0; tileY < EDITOR_E1_TILEMAP.rows; tileY += 1) {
    for (let tileX = 0; tileX < EDITOR_E1_TILEMAP.columns; tileX += 1) {
      if (!isEditorE1WallCell(tileX, tileY)) continue;
      walls[tileY][tileX] = packedTileGid(wallTile(tileX, tileY));
      collisionCells.push({ tileX, tileY });
    }
  }

  decoration[0][7] = packedTileGid(INTERIOR_TILES.bulletinBoard);
  decoration[0][8] = packedTileGid(INTERIOR_TILES.safe);

  return { ground, walls, decoration, collisionCells };
}

export function editorE1CollisionRect(cell: { tileX: number; tileY: number }) {
  const tileSize = GAMEPLAY_TILESETS.interiorsNative.tileSize;
  return {
    x: EDITOR_E1_TILEMAP.x + cell.tileX * tileSize,
    y: EDITOR_E1_TILEMAP.y + cell.tileY * tileSize,
    width: tileSize,
    height: tileSize
  };
}
