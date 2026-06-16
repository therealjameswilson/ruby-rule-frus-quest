import { describe, expect, it } from "vitest";
import {
  evaluateTypesetterCorrectionsAnswer,
  getTypesetterCorrectionsPrompt,
  TYPESETTER_CORRECTIONS_PROMPTS,
  TYPESETTER_CORRECTIONS_SOURCE_URL,
  typesetterCorrectionsComplete
} from "./typesetterCorrections";

describe("typesetter corrections", () => {
  it("models the final correction docket from the FRUS stages page", () => {
    expect(TYPESETTER_CORRECTIONS_SOURCE_URL).toContain("history.state.gov");
    expect(TYPESETTER_CORRECTIONS_PROMPTS.map((prompt) => prompt.id)).toEqual([
      "compiler_consultation",
      "visible_resolution",
      "finished_volume"
    ]);
    expect(TYPESETTER_CORRECTIONS_PROMPTS[0].sourceBasis).toContain("consultation with the compiler");
    expect(TYPESETTER_CORRECTIONS_PROMPTS[2].sourceBasis).toContain("volume is then finished");
  });

  it("accepts each correct correction answer", () => {
    for (const prompt of TYPESETTER_CORRECTIONS_PROMPTS) {
      const result = evaluateTypesetterCorrectionsAnswer(prompt.id, prompt.correctValue);

      expect(result.ok).toBe(true);
      expect(result.violation).toBeNull();
      expect(result.message).toBe(prompt.successMessage);
    }
  });

  it("maps shortcut corrections to standards violations", () => {
    expect(evaluateTypesetterCorrectionsAnswer("compiler_consultation", "danne_smoothing").violation).toBe("altered_text");
    expect(evaluateTypesetterCorrectionsAnswer("compiler_consultation", "ignore_flags").violation).toBe("omitted_material_fact");
    expect(evaluateTypesetterCorrectionsAnswer("visible_resolution", "silent_normalize").violation).toBe("altered_text");
    expect(evaluateTypesetterCorrectionsAnswer("visible_resolution", "drop_notes").violation).toBe("omitted_material_fact");
    expect(evaluateTypesetterCorrectionsAnswer("finished_volume", "deadline_stop").violation).toBe("missed_30_year_deadline");
  });

  it("reports completion only after all correction prompts are filed", () => {
    expect(typesetterCorrectionsComplete(0)).toBe(false);
    expect(typesetterCorrectionsComplete(TYPESETTER_CORRECTIONS_PROMPTS.length - 1)).toBe(false);
    expect(typesetterCorrectionsComplete(TYPESETTER_CORRECTIONS_PROMPTS.length)).toBe(true);
    expect(getTypesetterCorrectionsPrompt(99).id).toBe("finished_volume");
  });
});
