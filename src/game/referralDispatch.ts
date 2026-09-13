import type { Position } from "./types";
import { INTERIOR_TILES } from "./networkN1Tilemap";
import { EMPTY_TILE, packedTileGid } from "./packedTileIndex";
import type { ReferralR1TileLayers } from "./referralR1Tilemap";

export const DISPATCH_STACKS = {
  roomId: "R3",
  receipt: { x: 128, y: 66 },
  crank: { x: 176, y: 78 },
  index: { x: 48, y: 184 },
  evidence: "DISPATCH: WH MINUTES > NSC",
  caption: "TRAINING COPY / ROUTING ONLY"
} as const;

type Progress = Readonly<Record<string, number>>;
export const dispatchCopyFound = (progress: Progress) => progress.referralDispatchCopyFound === 1;
export const dispatchAisleOpen = (progress: Progress) => progress.referralDispatchAisleOpen === 1;

export function canPrepareDispatchBatch(step: number, carried: boolean, found: boolean) {
  return carried && found && Number.isInteger(step) && step >= 0 && step < 3;
}

export function dispatchShelfCell(x: number, y: number, open: boolean) {
  return x >= 4 && x <= 11 && y >= 4 && y <= 7 && !(open && (x === 7 || x === 8));
}

export function buildDispatchStackLayers(open: boolean): ReferralR1TileLayers {
  const ground: number[][] = [];
  const walls: number[][] = [];
  const decoration: number[][] = [];
  const collisionCells: Array<{ tileX: number; tileY: number }> = [];
  // Sparse, similarly shaded wood fills keep the walking route legible.
  const floors = [32, 40, 56, 57];
  for (let y = 0; y < 12; y++) {
    ground.push([]); walls.push([]); decoration.push([]);
    for (let x = 0; x < 16; x++) {
      const border = (x === 0 || x === 15 || y === 0 || y === 11)
        && !(y === 11 && (x === 7 || x === 8));
      const shelf = dispatchShelfCell(x, y, open);
      const detail = (x * 17 + y * 31) % 23;
      ground[y].push(packedTileGid(floors[detail < 3 ? detail + 1 : 0]));
      walls[y].push(border ? packedTileGid(INTERIOR_TILES.wallPanel) : shelf ? packedTileGid(19) : EMPTY_TILE);
      decoration[y].push(EMPTY_TILE);
      if (border || shelf) collisionCells.push({ tileX: x, tileY: y });
    }
  }
  return { ground, walls, decoration, collisionCells };
}

export type DispatchTarget = "receipt" | "crank" | "index";
export function nearbyDispatchTarget(position: Position): DispatchTarget | null {
  for (const id of ["receipt", "crank", "index"] as const) {
    const target = DISPATCH_STACKS[id];
    // Reachable only from the correct side of the shelves, never through them.
    if ((id === "index" ? position.y >= 163 : position.y <= 93)
      && Math.hypot(position.x - target.x, position.y - target.y) <= 26) return id;
  }
  return null;
}

export function dispatchObjective(progress: Progress) {
  if (!dispatchCopyFound(progress)) return "FIND DISPATCH COPY";
  return dispatchAisleOpen(progress) ? "SOUTH TO REVIEW" : "TURN SHELF CRANK";
}
