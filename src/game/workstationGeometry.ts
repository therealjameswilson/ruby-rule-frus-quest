import type { Position } from "./types";

export interface WorkstationSolid extends Position { width: number; height: number }
export const WORKSTATION_DESK = { width: 32, height: 16, tileIndex: 16 } as const;

export function workstationBounds(x: number, y: number): WorkstationSolid {
  const { width, height } = WORKSTATION_DESK;
  return { x: x - width / 2, y: y - height / 2, width, height };
}

// Match Player's terrain feet, including touching rectangle edges.
export function workstationFeetBlocked(p: Position, solids: readonly WorkstationSolid[]) {
  return solids.some(r => p.x + 8 >= r.x && p.x - 8 <= r.x + r.width
    && p.y + 5 >= r.y && p.y - 3 <= r.y + r.height);
}

export function safeWorkstationPosition(position: Position, solids: readonly WorkstationSolid[]): Position {
  if (!workstationFeetBlocked(position, solids)) return position;
  const candidates = solids.flatMap(r => [
    { x: position.x, y: r.y + r.height + 4 }, { x: position.x, y: r.y - 6 },
    { x: r.x - 9, y: position.y }, { x: r.x + r.width + 9, y: position.y }
  ]);
  candidates.push({ x: 128, y: 192 });
  return candidates.filter(p => p.x >= 14 && p.x <= 242 && p.y >= 42 && p.y <= 220
    && !workstationFeetBlocked(p, solids))
    .sort((a, b) => Math.hypot(a.x - position.x, a.y - position.y) - Math.hypot(b.x - position.x, b.y - position.y))[0] ?? position;
}

export function workstationApproach(target: Position, solids: readonly WorkstationSolid[]): Position {
  const desk = solids.find(r => r.width === WORKSTATION_DESK.width && r.height === WORKSTATION_DESK.height
    && target.x === r.x + r.width / 2 && target.y === r.y + r.height / 2);
  return desk ? { x: target.x, y: desk.y + desk.height + 12 } : target;
}

export function workstationAisleClear(from: Position, to: Position, solids: readonly WorkstationSolid[]) {
  if (from.x !== to.x && from.y !== to.y) return false;
  return !solids.some(r => Math.max(from.x, to.x) + 8 >= r.x
    && Math.min(from.x, to.x) - 8 <= r.x + r.width
    && Math.max(from.y, to.y) + 5 >= r.y && Math.min(from.y, to.y) - 3 <= r.y + r.height);
}

// Floor guidance only: the player still walks each leg, with normal collision.
export function workstationWalkRoute(from: Position, to: Position, solids: readonly WorkstationSolid[],
  aisles: { x: readonly number[]; y: readonly number[] }): Position[] {
  if (workstationAisleClear(from, to, solids)) return [to];
  const xs = [...new Set([...aisles.x, from.x, to.x])];
  const ys = [...new Set([...aisles.y, from.y, to.y])];
  const nodes = [from, to, ...xs.flatMap(x => ys.map(y => ({ x, y })))];
  const distances = nodes.map(() => Infinity), previous = nodes.map(() => -1);
  const visited = new Set<number>();
  distances[0] = 0;
  for (let step = 0; step < nodes.length; step++) {
    let current = -1;
    for (let i = 0; i < nodes.length; i++) {
      if (!visited.has(i) && Number.isFinite(distances[i]) && (current < 0 || distances[i] < distances[current])) current = i;
    }
    if (current < 0) break;
    if (current === 1) {
      const route: Position[] = [];
      for (let i = 1; i !== 0; i = previous[i]) route.unshift(nodes[i]);
      return route;
    }
    visited.add(current);
    for (let i = 1; i < nodes.length; i++) {
      if (visited.has(i) || !workstationAisleClear(nodes[current], nodes[i], solids)) continue;
      const distance = distances[current] + Math.abs(nodes[current].x - nodes[i].x) + Math.abs(nodes[current].y - nodes[i].y);
      if (distance < distances[i]) { distances[i] = distance; previous[i] = current; }
    }
  }
  return [];
}
