// ALTTP-style hitstop ("hit freeze"): on a clean sword/primary-action hit the
// game holds for a couple of frames so the impact reads as a crunch instead of
// a smear. This module is pure timing logic only — it never touches Phaser
// timers, tweens, or the camera, so the UI scene keeps running and nothing can
// be left permanently paused. Scenes gate their own actor updates on
// `HitstopController.isFrozen(now)` and the camera shake / flash tweens (which
// live on Phaser's own systems) continue playing through the freeze.

/** Milliseconds per frame at the game's 60fps NES cadence. */
export const HITSTOP_FRAME_MS = 1000 / 60;

/** SNES action games sit in this range; anything longer feels like a stall. */
export const MIN_HITSTOP_FRAMES = 2;
export const MAX_HITSTOP_FRAMES = 4;

export type HitstopKind = "sword-hit" | "sword-hit-heavy";

// Normal sword connect gets a crisp 3-frame hold; a heavy/critical hit (e.g.
// the Ruby Pen review) gets one more frame to sell the extra weight.
export const HITSTOP_FRAMES: Record<HitstopKind, number> = {
  "sword-hit": 3,
  "sword-hit-heavy": 4
};

export function framesToMs(frames: number, fps = 60): number {
  if (!Number.isFinite(frames) || !Number.isFinite(fps) || fps <= 0) return 0;
  return (Math.max(0, frames) * 1000) / fps;
}

/** Freeze duration in ms for a hit kind, clamped to the safe SNES frame range. */
export function resolveHitstopMs(kind: HitstopKind, fps = 60): number {
  const frames = Math.min(MAX_HITSTOP_FRAMES, Math.max(MIN_HITSTOP_FRAMES, HITSTOP_FRAMES[kind]));
  return framesToMs(frames, fps);
}

export class HitstopController {
  private frozenUntil = 0;

  /**
   * Hold gameplay for `ms` starting at `now`. Overlapping hits extend rather
   * than shorten the freeze, so a fast combo never cuts an earlier hold short.
   */
  freeze(now: number, ms: number): void {
    if (!Number.isFinite(now) || !Number.isFinite(ms) || ms <= 0) return;
    this.frozenUntil = Math.max(this.frozenUntil, now + ms);
  }

  freezeFor(now: number, kind: HitstopKind, fps = 60): void {
    this.freeze(now, resolveHitstopMs(kind, fps));
  }

  isFrozen(now: number): boolean {
    return Number.isFinite(now) && now < this.frozenUntil;
  }

  remainingMs(now: number): number {
    if (!Number.isFinite(now)) return 0;
    return Math.max(0, this.frozenUntil - now);
  }

  reset(): void {
    this.frozenUntil = 0;
  }
}

/** Grace window (ms) for a buffered primary-action press. */
export const ATTACK_BUFFER_MS = 110;

/**
 * Tiny input grace buffer for the primary action, mirroring the interaction
 * buffer used elsewhere. A swing pressed a hair early — or during a hitstop
 * freeze — is remembered and fired the instant the game can act again, so a
 * clean input is never silently dropped. `consume` fires at most once per press.
 */
export class AttackBuffer {
  private bufferedUntil = 0;

  press(now: number, windowMs = ATTACK_BUFFER_MS): void {
    if (!Number.isFinite(now)) return;
    this.bufferedUntil = now + Math.max(0, windowMs);
  }

  consume(now: number, canAct: boolean): boolean {
    if (!canAct || !Number.isFinite(now) || now > this.bufferedUntil) return false;
    this.bufferedUntil = 0;
    return true;
  }

  clear(): void {
    this.bufferedUntil = 0;
  }
}
