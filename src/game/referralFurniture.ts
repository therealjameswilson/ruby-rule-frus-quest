import type { Position } from "./types";
import { WORKSTATION_DESK, workstationWalkRoute, type WorkstationSolid } from "./workstationGeometry";
export { workstationBounds as referralDeskBounds, workstationFeetBlocked as referralFeetBlocked,
  safeWorkstationPosition as safeReferralPosition, workstationApproach as referralStationApproach,
  workstationAisleClear as referralAisleClear } from "./workstationGeometry";
export type ReferralSolid = WorkstationSolid;

export const REFERRAL_DESK = { ...WORKSTATION_DESK, frame: "referral-desk" } as const;
export const REFERRAL_PATROL: readonly Position[] = [
  { x: 214, y: 70 }, { x: 154, y: 68 }, { x: 98, y: 100 },
  { x: 98, y: 188 }, { x: 226, y: 188 }, { x: 226, y: 100 }
];
const AISLES = { x: [30, 98, 160, 226], y: [96, 180] } as const;

export function referralWalkRoute(from: Position, to: Position, solids: readonly ReferralSolid[]): Position[] {
  return workstationWalkRoute(from, to, solids, AISLES);
}
