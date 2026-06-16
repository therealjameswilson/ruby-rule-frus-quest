import { describe, expect, it } from "vitest";
import {
  addDocumentPoints,
  addProcessItem,
  addVolumeFragment,
  awardProcessStamp,
  clearDocumentUndisclosedDeletion,
  gameState,
  getFinalGateReadiness,
  getPublicationReadinessReadout,
  markDocumentUndisclosedDeletion,
  recordStandardsViolation,
  resetGameState,
  resolveStandardsViolation,
  resolveStandardsViolationForDocument,
  unresolvedStandardsViolations
} from "./state";

describe("standards violation ledger", () => {
  it("records unresolved Kellogg-standard violations and blocks the final gate", () => {
    resetGameState();

    const record = recordStandardsViolation("concealed_policy_defect", "DANN-E shortcut concealed policy defects.");

    expect(unresolvedStandardsViolations()).toEqual([record]);
    expect(getFinalGateReadiness().standardsViolations).toHaveLength(1);
    expect(getPublicationReadinessReadout().standards.clear).toBe(false);

    expect(resolveStandardsViolation(record.id)).toBe(true);
    expect(getFinalGateReadiness().standardsViolations).toHaveLength(0);
  });

  it("increments repeat violations in the same scope instead of creating duplicate blockers", () => {
    resetGameState();

    recordStandardsViolation("omitted_material_fact", "Wrong agency equity.");
    recordStandardsViolation("omitted_material_fact", "Wrong agency equity.");

    const unresolved = unresolvedStandardsViolations();
    expect(unresolved).toHaveLength(1);
    expect(unresolved[0].count).toBe(2);
  });

  it("resolves document-level undisclosed deletion blockers when bracketed text is restored", () => {
    resetGameState();

    markDocumentUndisclosedDeletion("doc-001", "test unbracketed excision");
    recordStandardsViolation("undisclosed_deletion", "Unbracketed excision.", "doc-001");

    expect(getPublicationReadinessReadout().standards.unresolved.some((entry) => entry.documentId === "doc-001")).toBe(true);
    expect(clearDocumentUndisclosedDeletion("doc-001", "bracketed insertion added")).toBe(true);
    expect(unresolvedStandardsViolations().some((entry) => entry.documentId === "doc-001")).toBe(false);
  });

  it("can resolve document-level blockers directly for non-scene repair flows", () => {
    resetGameState();

    recordStandardsViolation("undisclosed_deletion", "Manual repair queue.", "source_note_047");

    expect(resolveStandardsViolationForDocument("source_note_047", "undisclosed_deletion")).toBe(1);
    expect(unresolvedStandardsViolations()).toHaveLength(0);
  });

  it("blocks the final gate until publication apparatus is assembled", () => {
    resetGameState();
    (["rule", "archive", "network", "referral", "proof"] as const).forEach((stamp) => awardProcessStamp(stamp));
    addProcessItem("buckram_key");
    addDocumentPoints(20, "test apparatus points");
    for (const fragment of [
      "Front Matter Fragment",
      "Routing Fragment",
      "Referral Fragment",
      "Proof Fragment"
    ]) {
      addVolumeFragment(fragment);
    }
    for (const id of ["telegram_001", "source_note_047", "sbu_annotation_001", "proof_page_412"]) {
      const document = gameState.documentCandidates.find((candidate) => candidate.id === id);
      if (document) {
        document.selected = true;
        document.workflowState = "selected";
      }
    }

    expect(getFinalGateReadiness().publicationApparatus.complete).toBe(false);
    expect(getFinalGateReadiness().buckramGateOpen).toBe(false);
    expect(getPublicationReadinessReadout().missingSummary).toContain("Apparatus SRC");

    addVolumeFragment("Source Note Fragment");

    expect(getFinalGateReadiness().publicationApparatus.complete).toBe(false);
    expect(getPublicationReadinessReadout().missingSummary).toContain("Apparatus IDX");

    gameState.sceneProgress.typesettingPreparationComplete = 1;
    gameState.sceneProgress.typesetterProofComplete = 1;

    expect(getFinalGateReadiness().publicationApparatus.complete).toBe(false);
    expect(getPublicationReadinessReadout().missingSummary).toContain("Apparatus IDX");

    gameState.sceneProgress.indexDocketComplete = 1;

    expect(getFinalGateReadiness().publicationApparatus.complete).toBe(false);
    expect(getPublicationReadinessReadout().missingSummary).toContain("Apparatus ASM");

    gameState.sceneProgress.frontMatterAssemblyComplete = 1;

    expect(getFinalGateReadiness().publicationApparatus.complete).toBe(false);
    expect(getPublicationReadinessReadout().missingSummary).toContain("Apparatus FIX");

    gameState.sceneProgress.typesetterCorrectionsComplete = 1;

    expect(getFinalGateReadiness().publicationApparatus.complete).toBe(true);
  });
});
