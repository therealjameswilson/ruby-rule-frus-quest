import type { Position } from "./types";

export const DANNE_BOSS_DAMAGE = { ego_bolt: 10, swarm: 5 } as const;
export type DanneBossHitKind = keyof typeof DANNE_BOSS_DAMAGE;
export const DANNE_BOSS_RECOVERY_MS = 1000;
export const DANNE_BOSS_ENTRY_GRACE_MS = 900;
// Leave time to close the gap, recover the returning swing, and make two edits.
export const DANNE_BOSS_RETURN = { damage: 28, speed: 150, lifetimeMs: 2400, stunMs: 2000 } as const;
export const DANNE_CLOUD_SPREAD = [-0.28, 0, 0.28] as const;

export interface BossBoltMotion extends Position {
  vx: number;
  vy: number;
}

// Warning lanes and fired spreads share the same muzzle, angle, and endpoints.
export function bossSpreadTargets(from: Position, target: Position, offsets: readonly number[]): Position[] {
  const muzzleY = from.y - 10;
  const dx = target.x - from.x;
  const dy = target.y - muzzleY;
  const angle = Math.atan2(dy, dx);
  const distance = Math.max(48, Math.hypot(dx, dy));
  return offsets.map(offset => ({
    x: from.x + Math.cos(angle + offset) * distance,
    y: muzzleY + Math.sin(angle + offset) * distance
  }));
}

export function createBossBoltMotion(from: Position, target: Position, speed: number): BossBoltMotion {
  const x = from.x;
  const y = from.y - 10;
  const dx = target.x - x;
  const dy = target.y - y;
  const length = Math.max(1, Math.hypot(dx, dy));
  return { x, y, vx: dx / length * speed, vy: dy / length * speed };
}

// Integrate unrounded coordinates; only the sprite's rendered position is snapped.
export function advanceBossBolt(bolt: BossBoltMotion, deltaMs: number) {
  const dt = Math.max(0, Math.min(50, deltaMs)) / 1000;
  bolt.x += bolt.vx * dt;
  bolt.y += bolt.vy * dt;
}

export function aimReturnedBossBolt(bolt: BossBoltMotion, target: Position) {
  const dx = target.x - bolt.x;
  const dy = target.y - bolt.y;
  const distance = Math.max(1, Math.hypot(dx, dy));
  bolt.vx = dx / distance * DANNE_BOSS_RETURN.speed;
  bolt.vy = dy / distance * DANNE_BOSS_RETURN.speed;
}
