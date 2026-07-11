import { describe, expect, it } from "vitest";
import {
  declassificationReviewComplete,
  DECLASSIFICATION_HAC_SOURCE_URL,
  DECLASSIFICATION_REVIEW_PROMPTS,
  DECLASSIFICATION_REVIEW_SOURCE_URL,
  evaluateDeclassificationReviewAnswer,
  getDeclassificationReviewPrompt
} from "./declassificationReview";

describe("declassification review prompts", () => {
  it("keeps the Clearance Token review sequence stable", () => {
    expect(DECLASSIFICATION_REVIEW_PROMPTS.map((prompt) => prompt.id)).toEqual([
      "human_equity",
      "classified_channel",
      "documented_decision"
    ]);
    expect(DECLASSIFICATION_REVIEW_SOURCE_URL).toContain("history.state.gov");
    expect(DECLASSIFICATION_HAC_SOURCE_URL).toContain("history.state.gov");
  });

  it("accepts the correct declassification posture for every prompt", () => {
    for (const prompt of DECLASSIFICATION_REVIEW_PROMPTS) {
      const result = evaluateDeclassificationReviewAnswer(prompt.id, prompt.correctValue);

      expect(result.ok).toBe(true);
      expect(result.message).toBe(prompt.successMessage);
      expect(result.prompt.sourceBasis.length).toBeGreaterThan(40);
    }
  });

  it("rejects StateChat or shortcut sign-off for classified equities", () => {
    const prompt = getDeclassificationReviewPrompt(0);
    const result = evaluateDeclassificationReviewAnswer(prompt.id, "statechat_signoff");

    expect(result.ok).toBe(false);
    expect(result.message).toContain("cannot decide classified equities");
  });

  it("reports completion only after all review checks are passed", () => {
    expect(declassificationReviewComplete(0)).toBe(false);
    expect(declassificationReviewComplete(DECLASSIFICATION_REVIEW_PROMPTS.length - 1)).toBe(false);
    expect(declassificationReviewComplete(DECLASSIFICATION_REVIEW_PROMPTS.length)).toBe(true);
  });
});
