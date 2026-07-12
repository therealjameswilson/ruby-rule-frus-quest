import { describe, expect, it } from "vitest";
import {
  getGuideCavernStage,
  guideCavernActionCue,
  guideCavernObjective,
  guideCavernTargetId
} from "./guideCavernFlow";

describe("Guide Cavern onboarding flow", () => {
  it("exposes only the stamp before any reward is held", () => {
    const stage = getGuideCavernStage(false, false);
    expect(stage).toBe("stamp");
    expect(guideCavernTargetId(stage)).toBe("stamp");
    expect(guideCavernActionCue(stage)).toBe("FIND GOLD STAMP");
    expect(guideCavernObjective(stage)).toContain("Citation Stamp");
  });

  it("advances to the fragment after the stamp is held", () => {
    const stage = getGuideCavernStage(true, false);
    expect(stage).toBe("fragment");
    expect(guideCavernTargetId(stage)).toBe("fragment");
    expect(guideCavernActionCue(stage)).toBe("TAKE FRUS FRAGMENT");
  });

  it("advances to the gate only after both rewards are held", () => {
    const stage = getGuideCavernStage(true, true);
    expect(stage).toBe("gate");
    expect(guideCavernTargetId(stage)).toBe("gate");
    expect(guideCavernActionCue(stage)).toBe("OPEN SOUTH GATE");
  });
});
