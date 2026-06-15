import { describe, expect, it } from "vitest";
import type { ProcessStampId } from "./constants";
import { cloneDocumentCandidate, INITIAL_DOCUMENT_CANDIDATES } from "./documentWorkflow";
import {
  getPublicationApparatusReadout,
  PUBLICATION_APPARATUS_SOURCE_URL,
  publicationApparatusComplete,
  PUBLICATION_APPARATUS_MIN_DOCUMENT_POINTS
} from "./publicationApparatus";
import type { DocumentCandidate } from "./types";

const ALL_FRAGMENTS = [
  "Front Matter Fragment",
  "Source Note Fragment",
  "Routing Fragment",
  "Referral Fragment",
  "Proof Fragment"
];

function selectedBalancedDocuments() {
  const documents = INITIAL_DOCUMENT_CANDIDATES.map(cloneDocumentCandidate);
  for (const id of ["telegram_001", "source_note_047", "sbu_annotation_001", "proof_page_412"]) {
    const index = documents.findIndex((document) => document.id === id);
    documents[index] = { ...documents[index], selected: true, workflowState: "selected" };
  }
  return documents;
}

function context(overrides: Partial<{
  processStamps: ProcessStampId[];
  volumeFragments: string[];
  documentCandidates: DocumentCandidate[];
  documentPoints: number;
}> = {}) {
  return {
    processStamps: [] as ProcessStampId[],
    volumeFragments: [] as string[],
    documentCandidates: INITIAL_DOCUMENT_CANDIDATES.map(cloneDocumentCandidate),
    documentPoints: 0,
    ...overrides
  };
}

describe("publication apparatus", () => {
  it("tracks the source-backed final assembly components", () => {
    const readout = getPublicationApparatusReadout(context());

    expect(PUBLICATION_APPARATUS_SOURCE_URL).toContain("history.state.gov");
    expect(readout.components.map((component) => component.id)).toEqual([
      "preface_scope",
      "sources_consulted",
      "persons_abbreviations",
      "declassification_accounting",
      "index_typeset_check"
    ]);
    expect(readout.complete).toBe(false);
  });

  it("does not complete from fragments alone without research coverage and process work", () => {
    const readout = getPublicationApparatusReadout(context({
      volumeFragments: ALL_FRAGMENTS,
      documentPoints: PUBLICATION_APPARATUS_MIN_DOCUMENT_POINTS
    }));

    expect(readout.complete).toBe(false);
    expect(readout.missing.map((component) => component.id)).toEqual([
      "preface_scope",
      "sources_consulted",
      "declassification_accounting",
      "index_typeset_check"
    ]);
  });

  it("completes when front matter, sources, abbreviations, declassification accounting, and proof index are ready", () => {
    const completeContext = context({
      processStamps: ["rule", "referral", "proof"],
      volumeFragments: ALL_FRAGMENTS,
      documentCandidates: selectedBalancedDocuments(),
      documentPoints: PUBLICATION_APPARATUS_MIN_DOCUMENT_POINTS
    });
    const readout = getPublicationApparatusReadout(completeContext);

    expect(readout.complete).toBe(true);
    expect(readout.completed).toBe(readout.total);
    expect(publicationApparatusComplete(completeContext)).toBe(true);
  });

  it("blocks declassification accounting when an undisclosed deletion remains", () => {
    const documents = selectedBalancedDocuments();
    documents[0] = { ...documents[0], undisclosedDeletion: true };
    const readout = getPublicationApparatusReadout(context({
      processStamps: ["rule", "referral", "proof"],
      volumeFragments: ALL_FRAGMENTS,
      documentCandidates: documents,
      documentPoints: PUBLICATION_APPARATUS_MIN_DOCUMENT_POINTS
    }));

    expect(readout.complete).toBe(false);
    expect(readout.missing.map((component) => component.id)).toContain("declassification_accounting");
  });
});
