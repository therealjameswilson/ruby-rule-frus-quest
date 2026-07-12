import { GAMEPLAY_TILESETS } from "../assets/registry";
import { INTERIOR_TILES } from "./networkN1Tilemap";
import { EMPTY_TILE, packedTileGid } from "./packedTileIndex";

export const REFERRAL_R1_TILEMAP = {
  columns: 16,
  rows: 12,
  x: 0,
  y: 32
} as const;

export interface ReferralR1TileLayers {
  ground: number[][];
  walls: number[][];
  decoration: number[][];
  collisionCells: ReadonlyArray<{ tileX: number; tileY: number }>;
}

const EAST_EXIT_ROWS = new Set([4, 5, 6]);

function emptyLayer() {
  return Array.from(
    { length: REFERRAL_R1_TILEMAP.rows },
    () => Array<number>(REFERRAL_R1_TILEMAP.columns).fill(EMPTY_TILE)
  );
}

export function isReferralR1ExitCell(tileX: number, tileY: number) {
  return tileX === REFERRAL_R1_TILEMAP.columns - 1 && EAST_EXIT_ROWS.has(tileY);
}

export function isReferralR1WallCell(tileX: number, tileY: number) {
  const border = tileX === 0
    || tileX === REFERRAL_R1_TILEMAP.columns - 1
    || tileY === 0
    || tileY === REFERRAL_R1_TILEMAP.rows - 1;
  return border && !isReferralR1ExitCell(tileX, tileY);
}

function wallTile(tileX: number, tileY: number) {
  const corner = (tileX === 0 || tileX === REFERRAL_R1_TILEMAP.columns - 1)
    && (tileY === 0 || tileY === REFERRAL_R1_TILEMAP.rows - 1);
  if (corner) return INTERIOR_TILES.wallPanel;
  if (tileY === 0 || tileY === REFERRAL_R1_TILEMAP.rows - 1) {
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

export function buildReferralR1TileLayers(): ReferralR1TileLayers {
  const ground: number[][] = Array.from(
    { length: REFERRAL_R1_TILEMAP.rows },
    () => Array<number>(REFERRAL_R1_TILEMAP.columns).fill(packedTileGid(INTERIOR_TILES.darkWoodAltFloor))
  );
  const walls = emptyLayer();
  const decoration = emptyLayer();
  const collisionCells: Array<{ tileX: number; tileY: number }> = [];

  // The ruby process lane connects the intake tray to three agency stations.
  fillRect(ground, 7, 0, 2, REFERRAL_R1_TILEMAP.rows, INTERIOR_TILES.redCarpetFloor);
  fillRect(ground, 3, 5, 2, 2, INTERIOR_TILES.terminalPad);
  fillRect(ground, 7, 5, 2, 2, INTERIOR_TILES.terminalPad);
  fillRect(ground, 11, 5, 2, 2, INTERIOR_TILES.terminalPad);
  fillRect(ground, 7, 8, 2, 2, INTERIOR_TILES.sorterPad);

  // Quiet top-corner pads identify the colleague and StateChat work areas.
  fillRect(ground, 2, 1, 2, 2, INTERIOR_TILES.openNetFloor);
  fillRect(ground, 12, 1, 2, 2, INTERIOR_TILES.classNetFloor);

  for (let tileY = 0; tileY < REFERRAL_R1_TILEMAP.rows; tileY += 1) {
    for (let tileX = 0; tileX < REFERRAL_R1_TILEMAP.columns; tileX += 1) {
      if (!isReferralR1WallCell(tileX, tileY)) continue;
      walls[tileY][tileX] = packedTileGid(wallTile(tileX, tileY));
      collisionCells.push({ tileX, tileY });
    }
  }

  decoration[0][3] = packedTileGid(INTERIOR_TILES.bulletinBoard);
  decoration[0][12] = packedTileGid(INTERIOR_TILES.safe);

  return { ground, walls, decoration, collisionCells };
}

export function referralR1CollisionRect(cell: { tileX: number; tileY: number }) {
  const tileSize = GAMEPLAY_TILESETS.interiorsNative.tileSize;
  return {
    x: REFERRAL_R1_TILEMAP.x + cell.tileX * tileSize,
    y: REFERRAL_R1_TILEMAP.y + cell.tileY * tileSize,
    width: tileSize,
    height: tileSize
  };
}
