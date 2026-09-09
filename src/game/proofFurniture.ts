import type { Position } from "./types";
import type { SilentReadStationId } from "./silentReadReview";
import { EDITOR_DESK_POSITION } from "./editorE1Tilemap";
import { workstationWalkRoute, type WorkstationSolid } from "./workstationGeometry";

export const PROOF_STATION_POSITIONS: Record<SilentReadStationId, Position> = {
  "editor-desk": EDITOR_DESK_POSITION,
  opennet: { x: 48, y: 104 }, classnet: { x: 208, y: 104 },
  "referral-tray": { x: 64, y: 160 }, "proof-table": { x: 192, y: 160 },
  "consultation-desk": { x: 64, y: 104 }, "typeflow-rail": { x: 128, y: 160 }
};
export const PROOF_AISLES = { x: [28, 96, 160, 228], y: [80, 132, 184, 198] } as const;
// One patrol clears all three furniture layouts and the full 18x20 enemy body.
export const PROOF_PATROL: Position[] = [
  { x: 214, y: 70 }, { x: 128, y: 70 }, { x: 128, y: 132 },
  { x: 96, y: 132 }, { x: 96, y: 190 }, { x: 228, y: 190 },
  { x: 228, y: 132 }, { x: 128, y: 132 }, { x: 128, y: 70 }
];
export function proofWalkRoute(from: Position, to: Position, solids: readonly WorkstationSolid[]) {
  return workstationWalkRoute(from, to, solids, PROOF_AISLES);
}
