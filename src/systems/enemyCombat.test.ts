import { describe, expect, it } from "vitest";
import {
  isTelegraphActive,
  isTelegraphVisible,
  telegraphDurationMs,
  telegraphPhase,
  type TelegraphTiming
} from "./enemyCombat";

const TIMING: TelegraphTiming = { windupMs: 220, activeMs: 180, recoveryMs: 250 };

describe("telegraphPhase", () => {
  it("is idle before the attack starts", () => {
    expect(telegraphPhase(null, 1000, TIMING)).toBe("idle");
    expect(telegraphPhase(Number.NaN, 1000, TIMING)).toBe("idle");
  });

  it("walks through windup, active, and recovery in order", () => {
    const start = 1000;
    expect(telegraphPhase(start, start, TIMING)).toBe("windup");
    expect(telegraphPhase(start, start + 219, TIMING)).toBe("windup");
    expect(telegraphPhase(start, start + 220, TIMING)).toBe("active");
    expect(telegraphPhase(start, start + 399, TIMING)).toBe("active");
    expect(telegraphPhase(start, start + 400, TIMING)).toBe("recovery");
    expect(telegraphPhase(start, start + 649, TIMING)).toBe("recovery");
    expect(telegraphPhase(start, start + 650, TIMING)).toBe("idle");
  });

  it("treats a now before the start time as idle", () => {
    expect(telegraphPhase(2000, 1500, TIMING)).toBe("idle");
  });
});

describe("isTelegraphActive", () => {
  it("only reports the single damaging window, never during the windup tell", () => {
    const start = 0;
    expect(isTelegraphActive(start, TIMING.windupMs - 1, TIMING)).toBe(false);
    expect(isTelegraphActive(start, TIMING.windupMs, TIMING)).toBe(true);
    expect(isTelegraphActive(start, TIMING.windupMs + TIMING.activeMs, TIMING)).toBe(false);
  });

  it("gives the player a reaction window before damage lands", () => {
    // The whole point: the cue is visible before damage is dealt.
    const start = 0;
    expect(isTelegraphVisible(start, 0, TIMING)).toBe(true);
    expect(isTelegraphActive(start, 0, TIMING)).toBe(false);
    expect(TIMING.windupMs).toBeGreaterThan(0);
  });
});

describe("isTelegraphVisible", () => {
  it("keeps the cue up across the full swing", () => {
    const start = 500;
    expect(isTelegraphVisible(start, start + 10, TIMING)).toBe(true);
    expect(isTelegraphVisible(start, start + 640, TIMING)).toBe(true);
    expect(isTelegraphVisible(start, start + 650, TIMING)).toBe(false);
  });
});

describe("telegraphDurationMs", () => {
  it("sums the phase windows and floors negatives at zero", () => {
    expect(telegraphDurationMs(TIMING)).toBe(650);
    expect(telegraphDurationMs({ windupMs: -50, activeMs: 100, recoveryMs: -10 })).toBe(100);
  });
});
