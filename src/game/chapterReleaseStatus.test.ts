import { describe, expect, it } from "vitest";
import {
  CHAPTER_RELEASE_PROMPTS,
  CHAPTER_RELEASE_STATUS_SOURCE_URL,
  chapterReleaseComplete,
  evaluateChapterReleaseAnswer,
  getChapterReleasePrompt
} from "./chapterReleaseStatus";

describe("chapter release status", () => {
  it("models the official Status of the Series publication ledger", () => {
    expect(CHAPTER_RELEASE_STATUS_SOURCE_URL).toBe("https://history.state.gov/historicaldocuments/status-of-the-series");
    expect(CHAPTER_RELEASE_PROMPTS.map((prompt) => prompt.id)).toEqual([
      "production_stage",
      "incremental_chapters",
      "outstanding_chapters"
    ]);
    expect(CHAPTER_RELEASE_PROMPTS[0].sourceBasis).toContain("Planning, Research, Clearance, and Publication");
    expect(CHAPTER_RELEASE_PROMPTS[1].sourceBasis).toContain("published incrementally");
    expect(CHAPTER_RELEASE_PROMPTS[2].sourceBasis).toContain("outstanding chapters");
  });

  it("completes only after every status-ledger prompt is answered", () => {
    expect(chapterReleaseComplete(0)).toBe(false);
    expect(chapterReleaseComplete(CHAPTER_RELEASE_PROMPTS.length - 1)).toBe(false);
    expect(chapterReleaseComplete(CHAPTER_RELEASE_PROMPTS.length)).toBe(true);
  });

  it("accepts visible chapter status and maps shortcuts to standards damage", () => {
    const first = getChapterReleasePrompt(0);
    const correct = evaluateChapterReleaseAnswer(first.id, first.correctValue);
    const silentWait = evaluateChapterReleaseAnswer("incremental_chapters", "silent_wait");
    const falseClear = evaluateChapterReleaseAnswer("outstanding_chapters", "false_clear");
    const wrongStage = evaluateChapterReleaseAnswer("production_stage", "research");

    expect(correct.ok).toBe(true);
    expect(correct.violation).toBeNull();
    expect(silentWait.ok).toBe(false);
    expect(silentWait.violation).toBe("omitted_material_fact");
    expect(falseClear.ok).toBe(false);
    expect(falseClear.violation).toBe("concealed_policy_defect");
    expect(wrongStage.ok).toBe(false);
    expect(wrongStage.violation).toBe("altered_text");
  });
});
