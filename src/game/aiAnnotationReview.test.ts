import { describe, expect, it } from "vitest";
import {
  aiAnnotationReviewComplete,
  AI_ANNOTATION_REVIEW_PROMPTS,
  AI_ANNOTATION_REVIEW_SOURCE_URL,
  evaluateAiAnnotationReviewAnswer,
  getAiAnnotationReviewPrompt
} from "./aiAnnotationReview";

describe("AI annotation review SOP prompts", () => {
  it("keeps the terminal-only annotation review sequence stable", () => {
    expect(AI_ANNOTATION_REVIEW_PROMPTS.map((prompt) => prompt.id)).toEqual([
      "mechanical_scope",
      "evidence_bound_route",
      "human_signoff"
    ]);
    expect(AI_ANNOTATION_REVIEW_SOURCE_URL).toContain("history.state.gov");
  });

  it("accepts the correct SOP answer for every prompt", () => {
    for (const prompt of AI_ANNOTATION_REVIEW_PROMPTS) {
      const result = evaluateAiAnnotationReviewAnswer(prompt.id, prompt.correctValue);

      expect(result.ok).toBe(true);
      expect(result.message).toBe(prompt.successMessage);
      expect(result.prompt.sourceBasis.length).toBeGreaterThan(40);
    }
  });

  it("rejects final sign-off by StateChat", () => {
    const prompt = getAiAnnotationReviewPrompt(2);
    const result = evaluateAiAnnotationReviewAnswer(prompt.id, "statechat");

    expect(result.ok).toBe(false);
    expect(result.message).toContain("cannot sign off");
  });

  it("reports completion only after all annotation SOP checks are passed", () => {
    expect(aiAnnotationReviewComplete(0)).toBe(false);
    expect(aiAnnotationReviewComplete(AI_ANNOTATION_REVIEW_PROMPTS.length - 1)).toBe(false);
    expect(aiAnnotationReviewComplete(AI_ANNOTATION_REVIEW_PROMPTS.length)).toBe(true);
  });
});
