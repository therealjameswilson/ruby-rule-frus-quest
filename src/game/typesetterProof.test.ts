import { describe, expect, it } from "vitest";
import {
  evaluateTypesetterProofAnswer,
  getTypesetterProofPrompt,
  TYPESETTER_PROOF_PROMPTS,
  typesetterProofComplete
} from "./typesetterProof";

describe("typesetter proof", () => {
  it("models the editing and typesetting pass from the FRUS stages page", () => {
    expect(TYPESETTER_PROOF_PROMPTS.map((prompt) => prompt.id)).toEqual([
      "typesetting_prep",
      "document_note_metadata",
      "compare_to_originals"
    ]);
    expect(TYPESETTER_PROOF_PROMPTS[0].sourceBasis).toContain("typesetting");
    expect(TYPESETTER_PROOF_PROMPTS[1].sourceBasis).toContain("classification");
    expect(TYPESETTER_PROOF_PROMPTS[1].sourceBasis).toContain("date");
    expect(TYPESETTER_PROOF_PROMPTS[2].sourceBasis).toContain("original documents");
  });

  it("completes only after every proof prompt is answered", () => {
    expect(typesetterProofComplete(0)).toBe(false);
    expect(typesetterProofComplete(TYPESETTER_PROOF_PROMPTS.length - 1)).toBe(false);
    expect(typesetterProofComplete(TYPESETTER_PROOF_PROMPTS.length)).toBe(true);
  });

  it("accepts faithful proofing and maps bad shortcuts to standards violations", () => {
    const first = getTypesetterProofPrompt(0);
    const correct = evaluateTypesetterProofAnswer(first.id, first.correctValue);
    const smoothedDate = evaluateTypesetterProofAnswer("document_note_metadata", "smooth_date");
    const silentResolution = evaluateTypesetterProofAnswer("compare_to_originals", "silent_resolution");

    expect(correct.ok).toBe(true);
    expect(correct.violation).toBeNull();
    expect(smoothedDate.ok).toBe(false);
    expect(smoothedDate.violation).toBe("altered_text");
    expect(silentResolution.ok).toBe(false);
    expect(silentResolution.violation).toBe("undisclosed_deletion");
  });
});
