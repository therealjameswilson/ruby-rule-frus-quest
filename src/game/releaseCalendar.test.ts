import { describe, expect, it } from "vitest";
import {
  RELEASE_CALENDAR_PROMPTS,
  evaluateReleaseCalendarAnswer,
  getReleaseCalendarPrompt,
  releaseCalendarComplete
} from "./releaseCalendar";

describe("release calendar docket", () => {
  it("models public release timing and digitization from the Status page", () => {
    expect(RELEASE_CALENDAR_PROMPTS.map((prompt) => prompt.id)).toEqual([
      "current_previous_releases",
      "anticipated_releases",
      "digitization_queue"
    ]);
    expect(RELEASE_CALENDAR_PROMPTS[0].sourceBasis).toContain("current and previous calendar year");
    expect(RELEASE_CALENDAR_PROMPTS[1].sourceBasis).toContain("planned for later in the current year");
    expect(RELEASE_CALENDAR_PROMPTS[2].sourceBasis).toContain("published volumes being digitized");
  });

  it("completes only after every public-status prompt is answered", () => {
    expect(releaseCalendarComplete(0)).toBe(false);
    expect(releaseCalendarComplete(RELEASE_CALENDAR_PROMPTS.length - 1)).toBe(false);
    expect(releaseCalendarComplete(RELEASE_CALENDAR_PROMPTS.length)).toBe(true);
  });

  it("accepts the official status handling and maps shortcuts to standards violations", () => {
    const first = getReleaseCalendarPrompt(0);
    const correct = evaluateReleaseCalendarAnswer(first.id, first.correctValue);
    const falsePublished = evaluateReleaseCalendarAnswer("anticipated_releases", "false_published");
    const suppressed = evaluateReleaseCalendarAnswer("digitization_queue", "suppress_digitization");

    expect(correct.ok).toBe(true);
    expect(correct.violation).toBeNull();
    expect(falsePublished.ok).toBe(false);
    expect(falsePublished.violation).toBe("concealed_policy_defect");
    expect(suppressed.ok).toBe(false);
    expect(suppressed.violation).toBe("omitted_material_fact");
  });
});
