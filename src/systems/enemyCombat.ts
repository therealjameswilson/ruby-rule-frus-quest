// Pure, Phaser-free helpers for ALTTP-style enemy attack readability.
//
// An enemy attack runs through three readable phases:
//   windup   - the tell (cue/arc flashes, no damage yet) so the player can react
//   active   - the single damaging frame window
//   recovery - the follow-through the player can punish, still no new damage
// After recovery the attack returns to idle and the per-attack cooldown gates
// the next swing. Keeping this timing pure makes the fairness window testable.

export type TelegraphPhase = "idle" | "windup" | "active" | "recovery";

export interface TelegraphTiming {
  windupMs: number;
  activeMs: number;
  recoveryMs: number;
}

export function telegraphDurationMs(timing: TelegraphTiming): number {
  return Math.max(0, timing.windupMs) + Math.max(0, timing.activeMs) + Math.max(0, timing.recoveryMs);
}

export function telegraphPhase(startedAt: number | null, now: number, timing: TelegraphTiming): TelegraphPhase {
  if (startedAt === null || !Number.isFinite(startedAt)) return "idle";
  const elapsed = now - startedAt;
  if (elapsed < 0) return "idle";
  const windup = Math.max(0, timing.windupMs);
  const active = Math.max(0, timing.activeMs);
  const recovery = Math.max(0, timing.recoveryMs);
  if (elapsed < windup) return "windup";
  if (elapsed < windup + active) return "active";
  if (elapsed < windup + active + recovery) return "recovery";
  return "idle";
}

// True only during the single damaging window, so contact damage lands after
// the tell instead of on the same frame the cue appears.
export function isTelegraphActive(startedAt: number | null, now: number, timing: TelegraphTiming): boolean {
  return telegraphPhase(startedAt, now, timing) === "active";
}

// The cue/arc should stay visible through windup + active + recovery so the
// player reads the whole swing, not just the damaging frame.
export function isTelegraphVisible(startedAt: number | null, now: number, timing: TelegraphTiming): boolean {
  return telegraphPhase(startedAt, now, timing) !== "idle";
}
