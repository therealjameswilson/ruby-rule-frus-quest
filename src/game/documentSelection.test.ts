import { describe, expect, it } from "vitest";
import { cloneDocumentCandidate, INITIAL_DOCUMENT_CANDIDATES } from "./documentWorkflow";
import {
  DOCUMENT_SELECTION_POINT_VALUE,
  evaluateDocumentSelectionAnswer,
  recommendedCandidateIds
} from "./documentSelection";

const documents = INITIAL_DOCUMENT_CANDIDATES.map(cloneDocumentCandidate);

describe("FRUS document candidate selection", () => {
  it("recommends significant records that preserve hard evidence and provenance", () => {
    expect(recommendedCandidateIds(documents)).toEqual([
      "telegram_001",
      "source_note_047",
      "sbu_annotation_001",
      "proof_page_412"
    ]);
  });

  it("awards document points for the balanced FRUS candidate set", () => {
    const result = evaluateDocumentSelectionAnswer("balanced_record", documents);

    expect(result.ok).toBe(true);
    expect(result.selectedDocumentIds).toEqual(recommendedCandidateIds(documents));
    expect(result.documentPoints).toBe(DOCUMENT_SELECTION_POINT_VALUE);
    expect(result.violation).toBeNull();
  });

  it("treats public-only selection as omission of material facts", () => {
    const result = evaluateDocumentSelectionAnswer("public_only", documents);

    expect(result.ok).toBe(false);
    expect(result.selectedDocumentIds).toEqual(["cross_reference_001", "proof_page_412"]);
    expect(result.violation).toBe("omitted_material_fact");
    expect(result.message).toContain("omits");
  });

  it("treats low-risk-only selection as concealing policy defects", () => {
    const result = evaluateDocumentSelectionAnswer("low_risk_only", documents);

    expect(result.ok).toBe(false);
    expect(result.selectedDocumentIds).toEqual(["proof_page_412", "telegram_001"]);
    expect(result.violation).toBe("concealed_policy_defect");
  });
});
