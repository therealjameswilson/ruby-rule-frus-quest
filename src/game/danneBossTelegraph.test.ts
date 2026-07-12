import { describe, expect, it } from "vitest";
import {
  danneAttackTelegraphSpec,
  danneTelegraphPulseOn,
  danneTelegraphRemainingMs,
  type DanneAttackPhase
} from "./danneBossTelegraph";

describe("DANN-E attack telegraphs", () => {
  it("gives every combat phase a readable pre-attack window", () => {
    const phases: DanneAttackPhase[] = ["colossus", "swarm", "cloud", "ascendant"];
    for (const phase of phases) {
      const spec = danneAttackTelegraphSpec(phase, phase === "cloud");
      expect(spec.durationMs).toBeGreaterThanOrEqual(450);
      expect(spec.cooldownMs).toBeGreaterThan(spec.durationMs);
      expect(spec.label.length).toBeGreaterThan(0);
    }
  });

  it("distinguishes a Cloud Form shift from a stationary spread", () => {
    expect(danneAttackTelegraphSpec("cloud", true).kind).toBe("cloud_shift");
    expect(danneAttackTelegraphSpec("cloud", false).kind).toBe("cloud_spread");
  });

  it("clamps the countdown and pulses deterministically", () => {
    expect(danneTelegraphRemainingMs(1500, 1100)).toBe(400);
    expect(danneTelegraphRemainingMs(1500, 1600)).toBe(0);
    expect(danneTelegraphPulseOn(1000, 1000)).toBe(true);
    expect(danneTelegraphPulseOn(1000, 1090)).toBe(false);
    expect(danneTelegraphPulseOn(1000, 1180)).toBe(true);
  });
});
