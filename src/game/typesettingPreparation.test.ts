import { describe, expect, it } from "vitest";
import {
  evaluateTypesettingPreparationAnswer,
  getTypesettingPreparationPrompt,
  TYPESETTING_PREPARATION_PROMPTS,
  TYPESETTING_PREPARATION_SOURCE_URL,
  typesettingPreparationComplete
} from "./typesettingPreparation";

describe("typesetting preparation", () => {
  it("models printer-copy preparation before typeset proofing", () => {
    expect(TYPESETTING_PREPARATION_SOURCE_URL).toBe("https://history.state.gov/historicaldocuments/frus-history/stages");
    expect(TYPESETTING_PREPARATION_PROMPTS.map((prompt) => prompt.id)).toEqual([
      "publication_copy",
      "document_note_metadata"
    ]);
    expect(TYPESETTING_PREPARATION_PROMPTS[0].sourceBasis).toContain("prepared for typesetting");
    expect(TYPESETTING_PREPARATION_PROMPTS[1].sourceBasis).toContain("classification");
    expect(TYPESETTING_PREPARATION_PROMPTS[1].sourceBasis).toContain("drafting");
    expect(TYPESETTING_PREPARATION_PROMPTS[1].sourceBasis).toContain("date");
  });

  it("completes only after every preparation prompt is answered", () => {
    expect(typesettingPreparationComplete(0)).toBe(false);
    expect(typesettingPreparationComplete(TYPESETTING_PREPARATION_PROMPTS.length - 1)).toBe(false);
    expect(typesettingPreparationComplete(TYPESETTING_PREPARATION_PROMPTS.length)).toBe(true);
  });

  it("accepts source-backed answers and maps shortcuts to standards violations", () => {
    const first = getTypesettingPreparationPrompt(0);
    const correct = evaluateTypesettingPreparationAnswer(first.id, first.correctValue);
    const machineRewrite = evaluateTypesettingPreparationAnswer("publication_copy", "machine_rewrite");
    const pageOnly = evaluateTypesettingPreparationAnswer("document_note_metadata", "page_number_only");

    expect(correct.ok).toBe(true);
    expect(correct.violation).toBeNull();
    expect(machineRewrite.ok).toBe(false);
    expect(machineRewrite.violation).toBe("altered_text");
    expect(pageOnly.ok).toBe(false);
    expect(pageOnly.violation).toBe("omitted_material_fact");
  });
});
