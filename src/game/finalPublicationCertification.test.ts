import { describe, expect, it } from "vitest";
import {
  addDanneItem,
  addDocumentPoints,
  addProcessItem,
  addVolumeFragment,
  awardProcessStamp,
  certifyFinalPublicationAfterDanne,
  gameState,
  getProductionBoardReadout,
  getPublicationReadinessReadout,
  resetGameState
} from "./state";

const FINAL_VOLUME_FRAGMENTS = [
  "Front Matter Fragment",
  "Source Note Fragment",
  "Routing Fragment",
  "Referral Fragment",
  "Proof Fragment"
] as const;

function completeDocuments() {
  const selectedIds = new Set(["telegram_001", "source_note_047", "sbu_annotation_001", "proof_page_412"]);
  gameState.documentCandidates = gameState.documentCandidates.map((document) => ({
    ...document,
    selected: selectedIds.has(document.id),
    citationComplete: true,
    annotationNeeded: false,
    workflowState: "proofed",
    reviewStatus: "cleared",
    equities: document.equities.map((equity) => ({ ...equity, response: "cleared" }))
  }));
}

function completeProductionState() {
  (["rule", "archive", "sop", "network", "referral", "proof"] as const).forEach((stamp) => awardProcessStamp(stamp));
  addProcessItem("buckram_key");
  addDocumentPoints(100, "test publication packet");
  FINAL_VOLUME_FRAGMENTS.forEach((fragment) => addVolumeFragment(fragment));
  completeDocuments();
  Object.assign(gameState.sceneProgress, {
    seriesConceptComplete: 1,
    volumeConceptComplete: 1,
    recordsAccessComplete: 1,
    recordCollectionComplete: 1,
    selectionDocketComplete: 1,
    annotationDraftingComplete: 1,
    manuscriptReviewComplete: 1,
    clearanceProcedureComplete: 1,
    eo13526ReviewComplete: 1,
    declassificationReviewComplete: 1,
    foreignGovernmentPermissionComplete: 1,
    withholdingAppealComplete: 1,
    senateHacReviewComplete: 1,
    editorialMethodologyComplete: 1,
    editorialTreatmentComplete: 1,
    typeflowOrderComplete: 1,
    typesetterProofComplete: 1,
    frontMatterAssemblyComplete: 1,
    kelloggFinalCertificationComplete: 1
  });
}

describe("final publication certification", () => {
  it("refuses to certify DANN-E defeat when the Buckram Gate is still locked", () => {
    resetGameState();

    const result = certifyFinalPublicationAfterDanne();

    expect(result.ok).toBe(false);
    expect(result.trueEnding).toBe(false);
    expect(result.reason).toContain("Buckram Gate locked");
    expect(gameState.finalGateCertification).toBeNull();
  });

  it("publishes the lawful volume without unlocking the true ending when treaty fragments are incomplete", () => {
    resetGameState();
    completeProductionState();

    expect(getPublicationReadinessReadout().buckramGateOpen).toBe(true);
    const result = certifyFinalPublicationAfterDanne();

    expect(result.ok).toBe(true);
    expect(result.trueEnding).toBe(false);
    expect(result.reason).toContain("treaty record incomplete");
    expect(gameState.finalGateCertification?.status).toBe("published");
    expect(gameState.inventory).toContain("Published FRUS Cover");
    expect(getProductionBoardReadout().completed).toBe(getProductionBoardReadout().total);
  });

  it("unlocks the true ending only when the certified volume also has the complete treaty record", () => {
    resetGameState();
    completeProductionState();
    addDanneItem("treaty-fragments", 0);
    addDanneItem("treaty-fragments", 1);
    addDanneItem("treaty-fragments", 2);

    const result = certifyFinalPublicationAfterDanne();

    expect(result.ok).toBe(true);
    expect(result.trueEnding).toBe(true);
    expect(result.reason).toContain("complete treaty record");
    expect(gameState.finalGateCertification?.status).toBe("published");
    expect(gameState.sceneProgress.trueEndingPublicationCertified).toBe(1);
  });
});
