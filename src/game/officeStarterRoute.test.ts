import { describe, expect, it } from "vitest";
import { getOfficeStarterStage, officeStarterObjective, officeStarterTarget, officeQuestArrowPosition } from "./officeStarterRoute";

describe("Office starter route", () => {
  it("keeps the arrow above the visible target throughout its pixel-snapped bounce", () => {
    for (let time = 0; time < 2080; time += 17) {
      const position = officeQuestArrowPosition(72.4, 68.2, time);
      expect(Number.isInteger(position.x)).toBe(true);
      expect(Number.isInteger(position.y)).toBe(true);
      expect(position.y + 3).toBeLessThan(68.2);
      expect(position.y).toBeGreaterThanOrEqual(59);
      expect(position.y).toBeLessThanOrEqual(62);
    }
  });

  it("moves to each new target without retaining the old absolute tween position", () => {
    expect(officeQuestArrowPosition(72, 68, 0)).toEqual({ x: 72, y: 62 });
    expect(officeQuestArrowPosition(128, 117, 0)).toEqual({ x: 128, y: 111 });
    expect(officeQuestArrowPosition(128, 203, 520)).toEqual({ x: 128, y: 194 });
  });
  it.each([
    [{ juniorIntroduced: false, memoStatus: 0, hasArchiveKey: false }, "talk_jr", "junior"],
    [{ juniorIntroduced: true, memoStatus: 0, hasArchiveKey: false }, "take_memo", "memo"],
    [{ juniorIntroduced: true, memoStatus: 1, hasArchiveKey: false }, "route_memo", "inbox"],
    [{ juniorIntroduced: true, memoStatus: 2, hasArchiveKey: false }, "stamp_memo", "inbox"],
    [{ juniorIntroduced: true, memoStatus: 3, hasArchiveKey: false }, "recover_key", "junior"],
    [{ juniorIntroduced: true, memoStatus: 3, hasArchiveKey: true }, "enter_archive", "archive"]
  ] as const)("maps %o to %s", (context, expectedStage, expectedTarget) => {
    const stage = getOfficeStarterStage(context);
    expect(stage).toBe(expectedStage);
    expect(officeStarterTarget(stage).id).toBe(expectedTarget);
    expect(officeStarterObjective(stage).length).toBeGreaterThan(0);
  });

  it("clamps malformed memo status before deriving the route", () => {
    expect(getOfficeStarterStage({ juniorIntroduced: true, memoStatus: -8, hasArchiveKey: false })).toBe("take_memo");
    expect(getOfficeStarterStage({ juniorIntroduced: true, memoStatus: 99, hasArchiveKey: false })).toBe("recover_key");
  });
});
