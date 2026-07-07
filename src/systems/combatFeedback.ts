import type Phaser from "phaser";

export type HitFeedbackKind =
  | "player-hurt"
  | "player-hurt-heavy"
  | "boss-hit"
  | "boss-defeat";

export interface HitFeedbackProfile {
  /** Camera shake duration in milliseconds. */
  duration: number;
  /** Shake intensity as a fraction of the viewport (Phaser camera.shake units). */
  intensity: number;
}

// Tuned to stay subtle on the 256x240 logical canvas: at intensity 0.006 the
// camera drifts ~1.5px, which reads as an impact flinch without smearing the
// pixel art. Anything past ~0.012 starts to look like a bug at this scale.
export const HIT_FEEDBACK: Record<HitFeedbackKind, HitFeedbackProfile> = {
  "player-hurt": { duration: 170, intensity: 0.006 },
  "player-hurt-heavy": { duration: 260, intensity: 0.009 },
  "boss-hit": { duration: 110, intensity: 0.005 },
  "boss-defeat": { duration: 520, intensity: 0.012 }
};

const MAX_INTENSITY = 0.02;
const MAX_DURATION = 900;

export function resolveHitFeedback(kind: HitFeedbackKind, scale = 1): HitFeedbackProfile {
  const base = HIT_FEEDBACK[kind];
  const safeScale = Number.isFinite(scale) ? Math.max(0, scale) : 1;
  return {
    duration: Math.min(MAX_DURATION, Math.round(base.duration * safeScale)),
    intensity: Math.min(MAX_INTENSITY, base.intensity * safeScale)
  };
}

/**
 * Apply an ALTTP-style impact flinch to the scene's main camera. Safe to call
 * from any scene; no-ops if the camera is unavailable (e.g. during teardown).
 */
export function applyHitShake(scene: Phaser.Scene, kind: HitFeedbackKind, scale = 1): HitFeedbackProfile {
  const profile = resolveHitFeedback(kind, scale);
  const camera = scene.cameras?.main;
  if (camera && profile.intensity > 0 && profile.duration > 0) {
    camera.shake(profile.duration, profile.intensity);
  }
  return profile;
}
