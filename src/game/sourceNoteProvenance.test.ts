import { describe, expect, it } from "vitest";
import {
  evaluateSourceNoteProvenanceAnswer,
  getSourceNoteProvenancePrompt,
  sourceNoteProvenanceComplete,
  SOURCE_NOTE_PROVENANCE_PROMPTS,
  SOURCE_NOTE_PROVENANCE_SOURCE_URL
} from "./sourceNoteProvenance";

describe("source note provenance prompts", () => {
  it("keeps the Source Note 47 provenance sequence stable", () => {
    expect(SOURCE_NOTE_PROVENANCE_PROMPTS.map((prompt) => prompt.id)).toEqual([
      "repository",
      "collection",
      "folder"
    ]);
    expect(SOURCE_NOTE_PROVENANCE_SOURCE_URL).toContain("history.state.gov");
  });

  it("accepts the correct repository, collection, and folder answers", () => {
    for (const prompt of SOURCE_NOTE_PROVENANCE_PROMPTS) {
      const result = evaluateSourceNoteProvenanceAnswer(prompt.id, prompt.correctValue);

      expect(result.ok).toBe(true);
      expect(result.message).toBe(prompt.successMessage);
      expect(result.prompt.sourceBasis.length).toBeGreaterThan(40);
    }
  });

  it("rejects guessed provenance shortcuts", () => {
    const prompt = getSourceNoteProvenancePrompt(0);
    const result = evaluateSourceNoteProvenanceAnswer(prompt.id, "danne_guess");

    expect(result.ok).toBe(false);
    expect(result.message).toContain("guessed");
  });

  it("reports completion only after all provenance checks are passed", () => {
    expect(sourceNoteProvenanceComplete(0)).toBe(false);
    expect(sourceNoteProvenanceComplete(SOURCE_NOTE_PROVENANCE_PROMPTS.length - 1)).toBe(false);
    expect(sourceNoteProvenanceComplete(SOURCE_NOTE_PROVENANCE_PROMPTS.length)).toBe(true);
  });
});
