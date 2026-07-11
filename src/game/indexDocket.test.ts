import { describe, expect, it } from "vitest";
import {
  evaluateIndexDocketAnswer,
  getIndexDocketPrompt,
  indexDocketComplete,
  INDEX_DOCKET_PROMPTS,
  INDEX_DOCKET_SOURCE_URL
} from "./indexDocket";

describe("index docket", () => {
  it("tracks the publication-index sequence from the FRUS stages page", () => {
    expect(INDEX_DOCKET_SOURCE_URL).toContain("history.state.gov");
    expect(INDEX_DOCKET_PROMPTS.map((prompt) => prompt.id)).toEqual([
      "verified_entries",
      "cross_references",
      "no_machine_headings"
    ]);
    expect(INDEX_DOCKET_PROMPTS[0].sourceBasis).toContain("index is added");
  });

  it("accepts each correct index answer", () => {
    for (const prompt of INDEX_DOCKET_PROMPTS) {
      const result = evaluateIndexDocketAnswer(prompt.id, prompt.correctValue);

      expect(result.ok).toBe(true);
      expect(result.violation).toBeNull();
      expect(result.message).toBe(prompt.successMessage);
    }
  });

  it("maps bad index shortcuts to Kellogg-standard damage categories", () => {
    expect(evaluateIndexDocketAnswer("verified_entries", "famous_only").violation).toBe("omitted_material_fact");
    expect(evaluateIndexDocketAnswer("verified_entries", "machine_tags").violation).toBe("altered_text");
    expect(evaluateIndexDocketAnswer("cross_references", "duplicate_headings").violation).toBe("concealed_policy_defect");
    expect(evaluateIndexDocketAnswer("cross_references", "drop_hard_refs").violation).toBe("omitted_material_fact");
    expect(evaluateIndexDocketAnswer("no_machine_headings", "statechat_headings").violation).toBe("altered_text");
  });

  it("reports completion only after the index docket is fully filed", () => {
    expect(indexDocketComplete(0)).toBe(false);
    expect(indexDocketComplete(INDEX_DOCKET_PROMPTS.length - 1)).toBe(false);
    expect(indexDocketComplete(INDEX_DOCKET_PROMPTS.length)).toBe(true);
    expect(getIndexDocketPrompt(99).id).toBe("no_machine_headings");
  });
});
