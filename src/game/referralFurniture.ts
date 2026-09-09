import type { Position } from "./types";

export interface ReferralSolid extends Position {
  width: number;
  height: number;
}

export const REFERRAL_DESK = { width: 32, height: 16, tileIndex: 16, frame: "referral-desk" } as const;
export const REFERRAL_PATROL: readonly Position[] = [
  { x: 214, y: 70 }, { x: 154, y: 68 }, { x: 98, y: 100 },
  { x: 98, y: 188 }, { x: 226, y: 188 }, { x: 226, y: 100 }
];
const AISLES_X = [30, 98, 160, 226] as const;
const AISLES_Y = [96, 180] as const;

export function referralDeskBounds(x: number, y: number): ReferralSolid {
  return {
    x: x - REFERRAL_DESK.width / 2,
    y: y - REFERRAL_DESK.height / 2,
    width: REFERRAL_DESK.width,
    height: REFERRAL_DESK.height
  };
}

// Match Player's 16x8 terrain footprint, including touching rectangle edges.
export function referralFeetBlocked(position: Position, solids: readonly ReferralSolid[]): boolean {
  return solids.some(rect => position.x + 8 >= rect.x && position.x - 8 <= rect.x + rect.width
    && position.y + 5 >= rect.y && position.y - 3 <= rect.y + rect.height);
}

// Preserve old saves unless their feet now occupy solid furniture or a wall.
export function safeReferralPosition(position: Position, solids: readonly ReferralSolid[]): Position {
  if (!referralFeetBlocked(position, solids)) return position;
  const candidates = solids.flatMap(rect => [
    { x: position.x, y: rect.y + rect.height + 4 },
    { x: position.x, y: rect.y - 6 },
    { x: rect.x - 9, y: position.y },
    { x: rect.x + rect.width + 9, y: position.y }
  ]);
  candidates.push({ x: 128, y: 192 });
  return candidates.filter(p => p.x >= 14 && p.x <= 242 && p.y >= 42 && p.y <= 220
    && !referralFeetBlocked(p, solids))
    .sort((a, b) => Math.hypot(a.x - position.x, a.y - position.y) - Math.hypot(b.x - position.x, b.y - position.y))[0] ?? position;
}

export function referralStationApproach(target: Position, solids: readonly ReferralSolid[]): Position {
  const desk = solids.find(rect => rect.width === REFERRAL_DESK.width && rect.height === REFERRAL_DESK.height
    && target.x === rect.x + rect.width / 2 && target.y === rect.y + rect.height / 2);
  return desk ? { x: target.x, y: desk.y + desk.height + 12 } : target;
}

export function referralAisleClear(from: Position, to: Position, solids: readonly ReferralSolid[]): boolean {
  if (from.x !== to.x && from.y !== to.y) return false;
  return !solids.some(rect => Math.max(from.x, to.x) + 8 >= rect.x
    && Math.min(from.x, to.x) - 8 <= rect.x + rect.width
    && Math.max(from.y, to.y) + 5 >= rect.y && Math.min(from.y, to.y) - 3 <= rect.y + rect.height);
}

// Route only the floor cue through authored aisles; this never moves the player.
export function referralWalkRoute(from: Position, to: Position, solids: readonly ReferralSolid[]): Position[] {
  if (referralAisleClear(from, to, solids)) return [to];
  const xs = [...new Set([...AISLES_X, from.x, to.x])];
  const ys = [...new Set([...AISLES_Y, from.y, to.y])];
  const nodes = [from, to, ...xs.flatMap(x => ys.map(y => ({ x, y })))];
  const distances = nodes.map(() => Infinity);
  const previous = nodes.map(() => -1);
  const visited = new Set<number>();
  distances[0] = 0;
  for (let step = 0; step < nodes.length; step++) {
    let current = -1;
    for (let i = 0; i < nodes.length; i++) {
      if (!visited.has(i) && Number.isFinite(distances[i]) && (current < 0 || distances[i] < distances[current])) {
        current = i;
      }
    }
    if (current < 0) break;
    if (current === 1) {
      const route: Position[] = [];
      for (let i = 1; i !== 0; i = previous[i]) route.unshift(nodes[i]);
      return route;
    }
    visited.add(current);
    for (let i = 1; i < nodes.length; i++) {
      if (visited.has(i) || !referralAisleClear(nodes[current], nodes[i], solids)) continue;
      const distance = distances[current] + Math.abs(nodes[current].x - nodes[i].x) + Math.abs(nodes[current].y - nodes[i].y);
      if (distance < distances[i]) {
        distances[i] = distance;
        previous[i] = current;
      }
    }
  }
  return [];
}
