import { describe, expect, it } from "vitest";
import type { ProcessItemId, ProcessStampId } from "./constants";
import { cloneDocumentCandidate, INITIAL_DOCUMENT_CANDIDATES } from "./documentWorkflow";
import {
  FRUS_PRODUCTION_BOARD_STEPS,
  getFrusProductionBoardReadout,
  isFrusProductionBoardStepComplete
} from "./frusProductionBoard";
import type { FrusProductionBoardContext } from "./frusProductionBoard";
import type { DocumentCandidate, VolumeWorkflowState } from "./types";

function context(overrides: Partial<FrusProductionBoardContext> = {}): FrusProductionBoardContext {
  return {
    volumeWorkflowState: "charter",
    documentCandidates: INITIAL_DOCUMENT_CANDIDATES.map(cloneDocumentCandidate),
    processStamps: [],
    heldProcessItems: new Set<ProcessItemId>(),
    documentPoints: 0,
    reliability: 80,
    volumeFragments: [],
    finalGatePublished: false,
    ...overrides
  };
}

function withEquityResolved(document: DocumentCandidate): DocumentCandidate {
  return {
    ...cloneDocumentCandidate(document),
    equities: document.equities.map((equity) => ({ ...equity, response: "cleared" }))
  };
}

describe("FRUS production board", () => {
  it("keeps the history.state.gov production ladder in a stable order", () => {
    expect(FRUS_PRODUCTION_BOARD_STEPS.map((step) => step.id)).toEqual([
      "records_access",
      "research_selection",
      "source_notes",
      "declassification_review",
      "agency_referrals",
      "advisory_monitoring",
      "kellogg_editing",
      "publication_30_year"
    ]);
  });

  it("starts with the 20-year access step active and locks later steps", () => {
    const readout = getFrusProductionBoardReadout(context());

    expect(readout.completed).toBe(0);
    expect(readout.nextStep?.id).toBe("records_access");
    expect(readout.steps[0].status).toBe("active");
    expect(readout.steps[1].status).toBe("locked");
  });

  it("advances through source-backed production steps as FRUS tools and stamps are earned", () => {
    const documents = INITIAL_DOCUMENT_CANDIDATES.map(cloneDocumentCandidate);
    documents[2] = {
      ...documents[2],
      workflowState: "citation_verified",
      citationComplete: true
    };
    documents[4] = withEquityResolved(documents[4]);
    const readout = getFrusProductionBoardReadout(context({
      volumeWorkflowState: "proofing",
      documentCandidates: documents,
      processStamps: ["rule", "archive", "network", "referral", "sop", "proof"] satisfies ProcessStampId[],
      heldProcessItems: new Set<ProcessItemId>([
        "citation_stamp",
        "clearance_token",
        "concurrence_slip",
        "red_pencil",
        "proof_lens"
      ]),
      documentPoints: 20,
      reliability: 90
    }));

    expect(readout.steps.slice(0, 7).every((step) => step.complete)).toBe(true);
    expect(readout.nextStep?.id).toBe("publication_30_year");
  });

  it("blocks Kellogg completion when an unbracketed deletion remains unresolved", () => {
    const documents = INITIAL_DOCUMENT_CANDIDATES.map(cloneDocumentCandidate);
    documents[0] = {
      ...documents[0],
      undisclosedDeletion: true
    };
    const boardContext = context({
      documentCandidates: documents,
      processStamps: ["proof"],
      reliability: 90
    });

    expect(isFrusProductionBoardStepComplete("kellogg_editing", boardContext)).toBe(false);
  });

  it("requires Buckram Key, complete pendants, cleared equities, fragments, and publication state for the final step", () => {
    const documents = INITIAL_DOCUMENT_CANDIDATES.map(withEquityResolved);
    const notReady = context({
      processStamps: ["rule", "archive", "sop"],
      documentCandidates: documents,
      heldProcessItems: new Set<ProcessItemId>(["buckram_key"]),
      volumeFragments: ["A", "B", "C", "D"],
      volumeWorkflowState: "final_assembly" as VolumeWorkflowState
    });
    const ready = context({
      ...notReady,
      volumeFragments: ["A", "B", "C", "D", "E"]
    });

    expect(isFrusProductionBoardStepComplete("publication_30_year", notReady)).toBe(false);
    expect(isFrusProductionBoardStepComplete("publication_30_year", ready)).toBe(true);
  });
});
