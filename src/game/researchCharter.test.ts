import { describe, expect, it } from "vitest";
import {
  evaluateResearchCharterAnswer,
  getResearchCharterPrompt,
  researchCharterComplete,
  RESEARCH_CHARTER_PROMPTS
} from "./researchCharter";

describe("research charter prompts", () => {
  it("keeps the source-backed Office Hub charter sequence stable", () => {
    expect(RESEARCH_CHARTER_PROMPTS.map((prompt) => prompt.id)).toEqual([
      "scope_first",
      "research_route",
      "kellogg_selection"
    ]);
  });

  it("accepts the correct FRUS production answer for every prompt", () => {
    for (const prompt of RESEARCH_CHARTER_PROMPTS) {
      const result = evaluateResearchCharterAnswer(prompt.id, prompt.correctValue);

      expect(result.ok).toBe(true);
      expect(result.message).toBe(prompt.successMessage);
      expect(result.prompt.sourceBasis.length).toBeGreaterThan(30);
    }
  });

  it("rejects machine or shortcut answers", () => {
    const prompt = getResearchCharterPrompt(0);
    const result = evaluateResearchCharterAnswer(prompt.id, "machine");

    expect(result.ok).toBe(false);
    expect(result.message).toContain("Scope cannot be guessed");
  });

  it("reports completion only after all prompts are answered", () => {
    expect(researchCharterComplete(0)).toBe(false);
    expect(researchCharterComplete(RESEARCH_CHARTER_PROMPTS.length - 1)).toBe(false);
    expect(researchCharterComplete(RESEARCH_CHARTER_PROMPTS.length)).toBe(true);
  });
});
