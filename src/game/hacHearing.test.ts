import { describe, expect, it } from "vitest";
import {
  evaluateHacHearingAnswer,
  getHacHearingPrompt,
  hacHearingComplete,
  HAC_HEARING_PROMPTS
} from "./hacHearing";

describe("HAC hearing prompts", () => {
  it("keeps the advisory review sequence stable", () => {
    expect(HAC_HEARING_PROMPTS.map((prompt) => prompt.id)).toEqual([
      "monitor_process",
      "declassification_scope",
      "kellogg_standard"
    ]);
  });

  it("evaluates each correct answer and returns source-backed success text", () => {
    for (const prompt of HAC_HEARING_PROMPTS) {
      const result = evaluateHacHearingAnswer(prompt.id, prompt.correctValue);

      expect(result.ok).toBe(true);
      expect(result.message).toBe(prompt.successMessage);
      expect(result.prompt.sourceBasis.length).toBeGreaterThan(20);
    }
  });

  it("rejects incorrect answers with the prompt-specific correction", () => {
    const prompt = getHacHearingPrompt(0);
    const result = evaluateHacHearingAnswer(prompt.id, "machine_queue");

    expect(result.ok).toBe(false);
    expect(result.message).toContain("DANN-E");
  });

  it("reports completion after all hearing prompts", () => {
    expect(hacHearingComplete(0)).toBe(false);
    expect(hacHearingComplete(HAC_HEARING_PROMPTS.length - 1)).toBe(false);
    expect(hacHearingComplete(HAC_HEARING_PROMPTS.length)).toBe(true);
  });
});
