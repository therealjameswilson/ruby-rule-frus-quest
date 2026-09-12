import { describe, expect, it } from "vitest";
import {
  getGuideCavernStage,
  guideCavernActionCue,
  guideCavernObjective,
  guideCavernTargetId,
  reachedGuideExit
} from "./guideCavernFlow";

describe("Guide Cavern onboarding flow", () => {
  it("exposes only the stamp before any reward is held", () => {
    const stage = getGuideCavernStage(false, false);
    expect(stage).toBe("stamp");
    expect(guideCavernTargetId(stage)).toBe("stamp");
    expect(guideCavernActionCue(stage)).toBe("FIND GOLD STAMP");
    expect(guideCavernObjective(stage)).toContain("Citation Stamp");
  });

  it("teaches the secondary tool action after the stamp is held", () => {
    const stage = getGuideCavernStage(true, false);
    expect(stage).toBe("counter");
    expect(guideCavernTargetId(stage)).toBe("ego-seal");
    expect(guideCavernActionCue(stage)).toBe("FACE BOLT - SWING STAMP");
  });

  it("reveals the fragment only after the counter lesson", () => {
    const stage = getGuideCavernStage(true, false, true);
    expect(stage).toBe("fragment");
    expect(guideCavernTargetId(stage)).toBe("fragment");
    expect(guideCavernActionCue(stage)).toBe("TAKE FRONT MATTER");
    expect(guideCavernObjective(stage)).toContain("interact");
    expect(guideCavernObjective(stage)).not.toContain("use the stamp");
  });

  it("advances to the gate only after both rewards are held", () => {
    const stage = getGuideCavernStage(true, true);
    expect(stage).toBe("gate");
    expect(guideCavernTargetId(stage)).toBe("gate");
    expect(guideCavernActionCue(stage)).toBe("SOUTH: ARCHIVE");
  });

  it("walks through the earned gate only when moving south in its doorway", () => {
    expect(reachedGuideExit("gate", { x: 128, y: 180 }, true)).toBe(true);
    expect(reachedGuideExit("gate", { x: 128, y: 180 }, false)).toBe(false);
    expect(reachedGuideExit("gate", { x: 100, y: 180 }, true)).toBe(false);
    expect(reachedGuideExit("gate", { x: 128, y: 170 }, true)).toBe(false);
    for (const stage of ["stamp", "counter", "fragment"] as const) {
      expect(reachedGuideExit(stage, { x: 128, y: 180 }, true)).toBe(false);
    }
  });
});
