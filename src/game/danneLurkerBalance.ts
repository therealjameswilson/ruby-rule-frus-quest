export const DANNE_LURKER_ATTACK_RANGE = 72;
export const DANNE_LURKER_BOLT_SPEED = 44;
export const DANNE_LURKER_BOLT_COOLDOWN_MS = 3400;
export const DANNE_LURKER_BOLT_TELEGRAPH_MS = 620;
export const DANNE_LURKER_INITIAL_BOLT_DELAY_MS = 1800;

export const DANNE_LURKER_RELIABILITY_DAMAGE = {
  contact: 1,
  ego_bolt: 2
} as const;

export type DanneLurkerHitKind = keyof typeof DANNE_LURKER_RELIABILITY_DAMAGE;

export function danneLurkerTelegraphRemainingMs(resolvesAt: number, now: number) {
  return Math.max(0, Math.round(resolvesAt - now));
}
