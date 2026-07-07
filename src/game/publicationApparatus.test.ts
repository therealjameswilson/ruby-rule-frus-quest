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
  sourcesConsultedListComplete: boolean;
  typesettingPreparationComplete: boolean;
  typesetterProofComplete: boolean;
  readerAidRegistersComplete: boolean;
  indexDocketComplete: boolean;
  frontMatterAssemblyComplete: boolean;
  typesetterCorrectionsComplete: boolean;
}> = {}) {
  return {
    processStamps: [] as ProcessStampId[],
    volumeFragments: [] as string[],
    documentCandidates: INITIAL_DOCUMENT_CANDIDATES.map(cloneDocumentCandidate),
    documentPoints: 0,
    sourcesConsultedListComplete: false,
    typesettingPreparationComplete: false,
    typesetterProofComplete: false,
    readerAidRegistersComplete: false,
    indexDocketComplete: false,
    frontMatterAssemblyComplete: false,
    typesetterCorrectionsComplete: false,
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
      "reader_aid_registers",
      "index_typeset_check",
      "front_matter_assembly",
      "typesetter_corrections"
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
      "reader_aid_registers",
      "index_typeset_check",
      "front_matter_assembly",
      "typesetter_corrections"
    ]);
  });

  it("completes when front matter, sources, abbreviations, declassification accounting, typesetting prep, proof index, and typesetter corrections are ready", () => {
    const completeContext = context({
      processStamps: ["rule", "referral", "proof"],
      volumeFragments: ALL_FRAGMENTS,
      documentCandidates: selectedBalancedDocuments(),
      documentPoints: PUBLICATION_APPARATUS_MIN_DOCUMENT_POINTS,
      typesettingPreparationComplete: true,
      typesetterProofComplete: true,
      readerAidRegistersComplete: true,
      indexDocketComplete: true,
      frontMatterAssemblyComplete: true,
      typesetterCorrectionsComplete: true
    });
    const readout = getPublicationApparatusReadout(completeContext);

    expect(readout.complete).toBe(true);
    expect(readout.completed).toBe(readout.total);
    expect(publicationApparatusComplete(completeContext)).toBe(true);
  });

  it("keeps sources consulted open until the front-matter source list is filed", () => {
    const sourceListUnfiled = getPublicationApparatusReadout(context({
      processStamps: ["rule"],
      volumeFragments: ["Source Note Fragment"],
      documentCandidates: selectedBalancedDocuments()
    }));
    const sourceListFiled = getPublicationApparatusReadout(context({
      processStamps: ["rule"],
      volumeFragments: ["Source Note Fragment"],
      documentCandidates: selectedBalancedDocuments(),
      sourcesConsultedListComplete: true
    }));

    expect(sourceListUnfiled.missing.map((component) => component.id)).toContain("sources_consulted");
    expect(sourceListFiled.components.find((component) => component.id === "sources_consulted")?.complete).toBe(true);
  });

  it("blocks declassification accounting when an undisclosed deletion remains", () => {
    const documents = selectedBalancedDocuments();
    documents[0] = { ...documents[0], undisclosedDeletion: true };
    const readout = getPublicationApparatusReadout(context({
      processStamps: ["rule", "referral", "proof"],
      volumeFragments: ALL_FRAGMENTS,
      documentCandidates: documents,
      documentPoints: PUBLICATION_APPARATUS_MIN_DOCUMENT_POINTS,
      typesettingPreparationComplete: true,
      typesetterProofComplete: true,
      readerAidRegistersComplete: true,
      indexDocketComplete: true,
      frontMatterAssemblyComplete: true,
      typesetterCorrectionsComplete: true
    }));

    expect(readout.complete).toBe(false);
    expect(readout.missing.map((component) => component.id)).toContain("declassification_accounting");
  });

  it("blocks the index/typeset component until typesetting preparation, proof, and index docket are filed", () => {
    const readout = getPublicationApparatusReadout(context({
      processStamps: ["rule", "referral", "proof"],
      volumeFragments: ALL_FRAGMENTS,
      documentCandidates: selectedBalancedDocuments(),
      documentPoints: PUBLICATION_APPARATUS_MIN_DOCUMENT_POINTS
    }));

    expect(readout.complete).toBe(false);
    expect(readout.missing.map((component) => component.id)).toContain("index_typeset_check");
  });

  it("does not count the index/typeset component from typesetter proof alone", () => {
    const readout = getPublicationApparatusReadout(context({
      processStamps: ["rule", "referral", "proof"],
      volumeFragments: ALL_FRAGMENTS,
      documentCandidates: selectedBalancedDocuments(),
      documentPoints: PUBLICATION_APPARATUS_MIN_DOCUMENT_POINTS,
      typesetterProofComplete: true
    }));

    expect(readout.complete).toBe(false);
    expect(readout.missing.map((component) => component.id)).toContain("index_typeset_check");
  });

  it("does not count the index/typeset component from preparation plus proof without the index docket", () => {
    const readout = getPublicationApparatusReadout(context({
      processStamps: ["rule", "referral", "proof"],
      volumeFragments: ALL_FRAGMENTS,
      documentCandidates: selectedBalancedDocuments(),
      documentPoints: PUBLICATION_APPARATUS_MIN_DOCUMENT_POINTS,
      typesettingPreparationComplete: true,
      typesetterProofComplete: true
    }));

    expect(readout.complete).toBe(false);
    expect(readout.missing.map((component) => component.id)).toContain("index_typeset_check");
  });

  it("blocks publication apparatus until front matter assembly is filed", () => {
    const readout = getPublicationApparatusReadout(context({
      processStamps: ["rule", "referral", "proof"],
      volumeFragments: ALL_FRAGMENTS,
      documentCandidates: selectedBalancedDocuments(),
      documentPoints: PUBLICATION_APPARATUS_MIN_DOCUMENT_POINTS,
      sourcesConsultedListComplete: true,
      typesettingPreparationComplete: true,
      typesetterProofComplete: true,
      readerAidRegistersComplete: true,
      indexDocketComplete: true,
      typesetterCorrectionsComplete: true
    }));

    expect(readout.complete).toBe(false);
    expect(readout.missing.map((component) => component.id)).toEqual(["front_matter_assembly"]);
  });

  it("blocks publication apparatus until persons and abbreviations registers are filed", () => {
    const readout = getPublicationApparatusReadout(context({
      processStamps: ["rule", "referral", "proof"],
      volumeFragments: ALL_FRAGMENTS,
      documentCandidates: selectedBalancedDocuments(),
      documentPoints: PUBLICATION_APPARATUS_MIN_DOCUMENT_POINTS,
      typesettingPreparationComplete: true,
      typesetterProofComplete: true,
      frontMatterAssemblyComplete: true,
      indexDocketComplete: true,
      typesetterCorrectionsComplete: true
    }));

    expect(readout.complete).toBe(false);
    expect(readout.missing.map((component) => component.id)).toEqual(["reader_aid_registers"]);
  });

  it("blocks publication apparatus until remaining typesetter corrections are resolved", () => {
    const readout = getPublicationApparatusReadout(context({
      processStamps: ["rule", "referral", "proof"],
      volumeFragments: ALL_FRAGMENTS,
      documentCandidates: selectedBalancedDocuments(),
      documentPoints: PUBLICATION_APPARATUS_MIN_DOCUMENT_POINTS,
      typesettingPreparationComplete: true,
      typesetterProofComplete: true,
      readerAidRegistersComplete: true,
      indexDocketComplete: true,
      frontMatterAssemblyComplete: true
    }));

    expect(readout.complete).toBe(false);
    expect(readout.missing.map((component) => component.id)).toEqual(["typesetter_corrections"]);
  });
});
