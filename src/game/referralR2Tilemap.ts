import { GAMEPLAY_TILESETS } from "../assets/registry";
import { INTERIOR_TILES } from "./networkN1Tilemap";
import { EMPTY_TILE, packedTileGid } from "./packedTileIndex";

export const REFERRAL_R2_TILEMAP = {
  columns: 16,
  rows: 12,
  x: 0,
  y: 32
} as const;

export interface ReferralR2TileLayers {
  ground: number[][];
  walls: number[][];
  decoration: number[][];
  collisionCells: ReadonlyArray<{ tileX: number; tileY: number }>;
}

const EXIT_ROWS = new Set([4, 5, 6]);

function emptyLayer() {
  return Array.from(
    { length: REFERRAL_R2_TILEMAP.rows },
    () => Array<number>(REFERRAL_R2_TILEMAP.columns).fill(EMPTY_TILE)
  );
}

export function isReferralR2ExitCell(tileX: number, tileY: number) {
  const side = tileX === 0 || tileX === REFERRAL_R2_TILEMAP.columns - 1;
  return side && EXIT_ROWS.has(tileY);
}

export function isReferralR2WallCell(tileX: number, tileY: number) {
  const border = tileX === 0
    || tileX === REFERRAL_R2_TILEMAP.columns - 1
    || tileY === 0
    || tileY === REFERRAL_R2_TILEMAP.rows - 1;
  return border && !isReferralR2ExitCell(tileX, tileY);
}

function wallTile(tileX: number, tileY: number) {
  const corner = (tileX === 0 || tileX === REFERRAL_R2_TILEMAP.columns - 1)
    && (tileY === 0 || tileY === REFERRAL_R2_TILEMAP.rows - 1);
  if (corner) return INTERIOR_TILES.wallPanel;
  if (tileY === 0 || tileY === REFERRAL_R2_TILEMAP.rows - 1) {
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

export function buildReferralR2TileLayers(): ReferralR2TileLayers {
  const ground: number[][] = Array.from(
    { length: REFERRAL_R2_TILEMAP.rows },
    () => Array<number>(REFERRAL_R2_TILEMAP.columns).fill(packedTileGid(INTERIOR_TILES.openNetFloor))
  );
  const walls = emptyLayer();
  const decoration = emptyLayer();
  const collisionCells: Array<{ tileX: number; tileY: number }> = [];

  fillRect(ground, 7, 0, 2, REFERRAL_R2_TILEMAP.rows, INTERIOR_TILES.redCarpetFloor);
  fillRect(ground, 7, 5, 2, 2, INTERIOR_TILES.sorterPad);

  // Five concise floor marks celebrate resolved concurrences without adding
  // another layer of freestanding plaques around the reward pedestal.
  for (const tileX of [3, 5, 7, 9, 11]) {
    ground[3][tileX] = packedTileGid(INTERIOR_TILES.terminalPad);
  }

  for (let tileY = 0; tileY < REFERRAL_R2_TILEMAP.rows; tileY += 1) {
    for (let tileX = 0; tileX < REFERRAL_R2_TILEMAP.columns; tileX += 1) {
      if (!isReferralR2WallCell(tileX, tileY)) continue;
      walls[tileY][tileX] = packedTileGid(wallTile(tileX, tileY));
      collisionCells.push({ tileX, tileY });
    }
  }

  decoration[0][7] = packedTileGid(INTERIOR_TILES.bulletinBoard);
  decoration[0][8] = packedTileGid(INTERIOR_TILES.safe);

  return { ground, walls, decoration, collisionCells };
}

export function referralR2CollisionRect(cell: { tileX: number; tileY: number }) {
  const tileSize = GAMEPLAY_TILESETS.interiorsNative.tileSize;
  return {
    x: REFERRAL_R2_TILEMAP.x + cell.tileX * tileSize,
    y: REFERRAL_R2_TILEMAP.y + cell.tileY * tileSize,
    width: tileSize,
    height: tileSize
  };
}
