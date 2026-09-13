import type { BuckramBindingStationId } from "./buckramBinding";
import type { Position } from "./types";
import { packedTileGid } from "./packedTileIndex";
import { workstationBounds, workstationWalkRoute } from "./workstationGeometry";

export const BINDERY_STATIONS: Record<BuckramBindingStationId, Position> = {
  "front-matter-bench": { x: 42, y: 102 },
  "index-desk": { x: 42, y: 164 },
  "kellogg-press": { x: 128, y: 94 },
  "gpo-handoff": { x: 214, y: 102 },
  "public-release-terminal": { x: 214, y: 164 }
};
export const BINDERY_INBOX = { x: 128, y: 194, radius: 28 };
export const BINDING_PRESS = { x: 128, y: 148, radius: 28 };
export const BINDERY_SOLIDS = [
  ...Object.values(BINDERY_STATIONS).map(p => workstationBounds(p.x, p.y)),
  { x: 104, y: 140, width: 48, height: 16 },
  { x: 112, y: 188, width: 32, height: 12 }
];
export const BINDERY_TILEMAP = { x: 16, y: 56, columns: 14, rows: 10 };

export function binderyFloor() {
  // Four light stone fills from rows 5-6 keep the work surfaces distinct.
  const fills = [36, 37, 44, 45];
  return Array.from({ length: BINDERY_TILEMAP.rows }, (_, y) =>
    Array.from({ length: BINDERY_TILEMAP.columns }, (_, x) => packedTileGid(fills[(x + y * 3) % fills.length])));
}

export function binderyApproach(target: Position): Position {
  const solid = BINDERY_SOLIDS.find(r => target.x === r.x + r.width / 2 && target.y >= r.y && target.y <= r.y + r.height);
  return solid ? { x: target.x, y: solid.y + solid.height + 12 } : target;
}

export function binderyWalkRoute(from: Position, to: Position) {
  return workstationWalkRoute(from, binderyApproach(to), BINDERY_SOLIDS,
    { x: [16, 78, 178, 240], y: [78, 126, 174, 214] });
}
