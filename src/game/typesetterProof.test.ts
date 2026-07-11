import { describe, expect, it } from "vitest";
import {
  evaluateTypesetterProofAnswer,
  getTypesetterProofPrompt,
  TYPESETTER_PROOF_PROMPTS,
  typesetterProofComplete
} from "./typesetterProof";

describe("typesetter proof", () => {
  it("models the post-typesetting proof pass from the FRUS stages page", () => {
    expect(TYPESETTER_PROOF_PROMPTS.map((prompt) => prompt.id)).toEqual([
      "compare_to_originals",
      "flag_textual_issues"
    ]);
    expect(TYPESETTER_PROOF_PROMPTS[0].sourceBasis).toContain("original documents");
    expect(TYPESETTER_PROOF_PROMPTS[1].sourceBasis).toContain("compiler");
  });

  it("completes only after every proof prompt is answered", () => {
    expect(typesetterProofComplete(0)).toBe(false);
    expect(typesetterProofComplete(TYPESETTER_PROOF_PROMPTS.length - 1)).toBe(false);
    expect(typesetterProofComplete(TYPESETTER_PROOF_PROMPTS.length)).toBe(true);
  });

  it("accepts faithful proofing and maps bad shortcuts to standards violations", () => {
    const first = getTypesetterProofPrompt(0);
    const correct = evaluateTypesetterProofAnswer(first.id, first.correctValue);
    const trustTypesetter = evaluateTypesetterProofAnswer("compare_to_originals", "trust_typesetter");
    const silentResolution = evaluateTypesetterProofAnswer("flag_textual_issues", "silent_resolution");

    expect(correct.ok).toBe(true);
    expect(correct.violation).toBeNull();
    expect(trustTypesetter.ok).toBe(false);
    expect(trustTypesetter.violation).toBe("omitted_material_fact");
    expect(silentResolution.ok).toBe(false);
    expect(silentResolution.violation).toBe("undisclosed_deletion");
  });
});
