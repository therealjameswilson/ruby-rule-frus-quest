import { describe, expect, it } from "vitest";
import {
  evaluateManuscriptReviewAnswer,
  getManuscriptReviewPrompt,
  MANUSCRIPT_REVIEW_PROMPTS,
  manuscriptReviewComplete,
  manuscriptReviewPromptComplete
} from "./manuscriptReview";

describe("manuscript review", () => {
  it("models the two-pass human manuscript review from the FRUS stages page", () => {
    expect(MANUSCRIPT_REVIEW_PROMPTS.map((prompt) => prompt.id)).toEqual([
      "review_scope",
      "front_line_recommendations",
      "series_assessment"
    ]);
    expect(MANUSCRIPT_REVIEW_PROMPTS[0].sourceBasis).toContain("completeness");
    expect(MANUSCRIPT_REVIEW_PROMPTS[0].sourceBasis).toContain("annotation accuracy");
    expect(MANUSCRIPT_REVIEW_PROMPTS[1].sourceBasis).toContain("recommendations for amendment");
    expect(MANUSCRIPT_REVIEW_PROMPTS[2].sourceBasis).toContain("General Editor");
  });

  it("completes only after every review prompt is answered", () => {
    expect(manuscriptReviewComplete(0)).toBe(false);
    expect(manuscriptReviewComplete(MANUSCRIPT_REVIEW_PROMPTS.length - 1)).toBe(false);
    expect(manuscriptReviewComplete(MANUSCRIPT_REVIEW_PROMPTS.length)).toBe(true);
  });

  it("tracks each review pass as a separate gate", () => {
    expect(manuscriptReviewPromptComplete(0, "review_scope")).toBe(false);
    expect(manuscriptReviewPromptComplete(1, "review_scope")).toBe(true);
    expect(manuscriptReviewPromptComplete(1, "front_line_recommendations")).toBe(false);
    expect(manuscriptReviewPromptComplete(2, "front_line_recommendations")).toBe(true);
    expect(manuscriptReviewPromptComplete(2, "series_assessment")).toBe(false);
    expect(manuscriptReviewPromptComplete(3, "series_assessment")).toBe(true);
  });

  it("accepts the source-backed answer and maps shortcuts to standards violations", () => {
    const first = getManuscriptReviewPrompt(0);
    const correct = evaluateManuscriptReviewAnswer(first.id, first.correctValue);
    const silentCut = evaluateManuscriptReviewAnswer("front_line_recommendations", "silent_cuts");
    const hideDefects = evaluateManuscriptReviewAnswer("series_assessment", "hide_defects");

    expect(correct.ok).toBe(true);
    expect(correct.violation).toBeNull();
    expect(silentCut.ok).toBe(false);
    expect(silentCut.violation).toBe("undisclosed_deletion");
    expect(hideDefects.ok).toBe(false);
    expect(hideDefects.violation).toBe("concealed_policy_defect");
  });
});
