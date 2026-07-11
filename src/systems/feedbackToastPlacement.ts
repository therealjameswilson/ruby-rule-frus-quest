import { GAME_HEIGHT, GAME_WIDTH } from "../game/constants";

// How long a feedback toast stays fully visible before it begins to fade, and
// how long the fade itself takes. The live audit (2026-06-15) found the old
// 900ms bottom-hint swap was too brief and too low-contrast to register, so the
// toast holds noticeably longer and fades out rather than snapping away.
export const FEEDBACK_TOAST_HOLD_MS = 1600;
export const FEEDBACK_TOAST_FADE_MS = 400;
export const FEEDBACK_TOAST_TOTAL_MS = FEEDBACK_TOAST_HOLD_MS + FEEDBACK_TOAST_FADE_MS;

export interface ToastAnchorBounds {
  /** Smallest Y the toast may float to (keeps it below the top HUD band). */
  top: number;
  /** Largest Y the toast may float to (keeps it above the bottom hint band). */
  bottom: number;
  left: number;
  right: number;
}

export const DEFAULT_TOAST_BOUNDS: ToastAnchorBounds = {
  top: 54,
  bottom: GAME_HEIGHT - 26,
  left: 8,
  right: GAME_WIDTH - 8
};

export interface ToastPlacement {
  x: number;
  y: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

// Float the toast a fixed gap above the player's head so it reads as "coming
// from the player" while staying clear of the sprite and both HUD bands. Pure
// math so it can be unit-tested without Phaser.
export function computeToastPlacement(
  anchor: ToastPlacement,
  bounds: ToastAnchorBounds = DEFAULT_TOAST_BOUNDS,
  gapAbove = 26
): ToastPlacement {
  return {
    x: clamp(anchor.x, bounds.left, bounds.right),
    y: clamp(anchor.y - gapAbove, bounds.top, bounds.bottom)
  };
}

// Returns 0..1 opacity for a toast that has been visible for `elapsedMs`. Holds
// at full opacity, then fades, then reports 0 (caller hides it).
export function toastAlpha(elapsedMs: number): number {
  if (elapsedMs <= FEEDBACK_TOAST_HOLD_MS) return 1;
  if (elapsedMs >= FEEDBACK_TOAST_TOTAL_MS) return 0;
  const fadeProgress = (elapsedMs - FEEDBACK_TOAST_HOLD_MS) / FEEDBACK_TOAST_FADE_MS;
  return 1 - fadeProgress;
}

export function isToastExpired(elapsedMs: number): boolean {
  return elapsedMs >= FEEDBACK_TOAST_TOTAL_MS;
}
