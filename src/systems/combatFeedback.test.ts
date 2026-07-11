import { describe, expect, it } from "vitest";
import { HIT_FEEDBACK, resolveHitFeedback, type HitFeedbackKind } from "./combatFeedback";

const ALL_KINDS = Object.keys(HIT_FEEDBACK) as HitFeedbackKind[];

describe("combat feedback profiles", () => {
  it("returns the base profile at scale 1", () => {
    for (const kind of ALL_KINDS) {
      expect(resolveHitFeedback(kind)).toEqual({
        duration: HIT_FEEDBACK[kind].duration,
        intensity: HIT_FEEDBACK[kind].intensity
      });
    }
  });

  it("keeps every default intensity subtle enough for the 256x240 canvas", () => {
    for (const kind of ALL_KINDS) {
      expect(HIT_FEEDBACK[kind].intensity).toBeLessThanOrEqual(0.012);
      expect(HIT_FEEDBACK[kind].duration).toBeGreaterThan(0);
    }
  });

  it("hits harder for heavy player damage than for a normal hit", () => {
    const normal = resolveHitFeedback("player-hurt");
    const heavy = resolveHitFeedback("player-hurt-heavy");
    expect(heavy.intensity).toBeGreaterThan(normal.intensity);
    expect(heavy.duration).toBeGreaterThan(normal.duration);
  });

  it("scales duration and intensity together", () => {
    const base = resolveHitFeedback("boss-hit");
    const scaled = resolveHitFeedback("boss-hit", 2);
    expect(scaled.duration).toBe(base.duration * 2);
    expect(scaled.intensity).toBeCloseTo(base.intensity * 2, 6);
  });

  it("clamps runaway scales so shake never overwhelms the frame", () => {
    const huge = resolveHitFeedback("boss-defeat", 1000);
    expect(huge.intensity).toBeLessThanOrEqual(0.02);
    expect(huge.duration).toBeLessThanOrEqual(900);
  });

  it("treats negative or non-finite scales as no shake / safe defaults", () => {
    expect(resolveHitFeedback("player-hurt", -5).intensity).toBe(0);
    expect(resolveHitFeedback("player-hurt", Number.NaN)).toEqual({
      duration: HIT_FEEDBACK["player-hurt"].duration,
      intensity: HIT_FEEDBACK["player-hurt"].intensity
    });
  });
});
