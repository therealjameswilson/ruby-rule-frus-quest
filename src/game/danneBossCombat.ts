import type { Position } from "./types";

export const DANNE_BOSS_DAMAGE = { ego_bolt: 10, swarm: 5 } as const;
export type DanneBossHitKind = keyof typeof DANNE_BOSS_DAMAGE;
export const DANNE_BOSS_RECOVERY_MS = 1000;
export const DANNE_BOSS_ENTRY_GRACE_MS = 900;
export const DANNE_BOSS_RETURN = { damage: 28, speed: 150, lifetimeMs: 2400, stunMs: 1400 } as const;

export interface BossBoltMotion extends Position {
  vx: number;
  vy: number;
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
