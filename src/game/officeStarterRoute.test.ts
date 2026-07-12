import { describe, expect, it } from "vitest";
import { getOfficeStarterStage, officeStarterObjective, officeStarterTarget } from "./officeStarterRoute";

describe("Office starter route", () => {
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
