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
    hacReviewComplete: false,
    annotationDraftingComplete: false,
    foreignGovernmentPermissionComplete: false,
    withholdingAppealComplete: false,
    editorialMethodologyComplete: false,
    editorialTreatmentComplete: false,
    typeflowOrderComplete: false,
    typesettingPreparationComplete: false,
    typesetterProofComplete: false,
    manuscriptReviewComplete: false,
    clearanceProcedureComplete: false,
    eo13526ReviewComplete: false,
    recordsAccessComplete: false,
    researchCharterComplete: false,
    recordCollectionComplete: false,
    repositoryCoverageMapComplete: false,
    selectionDocketComplete: false,
    seriesConceptComplete: false,
    volumeConceptComplete: false,
    chapterReleaseComplete: false,
    digitalReleaseComplete: false,
    publicCitationComplete: false,
    releaseCalendarComplete: false,
    frontMatterAssemblyComplete: false,
    readerAidRegistersComplete: false,
    indexDocketComplete: false,
    typesetterCorrectionsComplete: false,
    kelloggFinalCertificationComplete: false,
    gpoSegmentAssemblyComplete: false,
    gpoPublicationComplete: false,
    publicationFundingComplete: false,
    ...overrides
  };
}

function withEquityResolved(document: DocumentCandidate): DocumentCandidate {
  return {
    ...cloneDocumentCandidate(document),
    equities: document.equities.map((equity) => ({ ...equity, response: "cleared" }))
  };
}

function balancedSelectedDocuments() {
  const documents = INITIAL_DOCUMENT_CANDIDATES.map(cloneDocumentCandidate);
  for (const id of ["telegram_001", "source_note_047", "sbu_annotation_001", "proof_page_412"]) {
    const index = documents.findIndex((document) => document.id === id);
    documents[index] = { ...documents[index], selected: true, workflowState: "proofed" };
  }
  documents[4] = withEquityResolved(documents[4]);
  return documents;
}

const COMPLETE_BEFORE_TYPEFLOW = {
  processStamps: ["rule", "archive", "network", "referral", "sop", "proof"] satisfies ProcessStampId[],
  heldProcessItems: new Set<ProcessItemId>([
    "citation_stamp",
    "clearance_token",
    "concurrence_slip",
    "red_pencil",
    "proof_lens"
  ]),
  documentPoints: 80,
  reliability: 90,
  documentCandidates: balancedSelectedDocuments(),
  annotationDraftingComplete: true,
  foreignGovernmentPermissionComplete: true,
  withholdingAppealComplete: true,
  editorialMethodologyComplete: true,
  editorialTreatmentComplete: true,
  manuscriptReviewComplete: true,
  clearanceProcedureComplete: true,
  eo13526ReviewComplete: true,
  recordsAccessComplete: true,
  researchCharterComplete: true,
  recordCollectionComplete: true,
  repositoryCoverageMapComplete: true,
  selectionDocketComplete: true,
  seriesConceptComplete: true,
  volumeConceptComplete: true
} as const;

const COMPLETE_BEFORE_PUBLICATION_APPARATUS = {
  ...COMPLETE_BEFORE_TYPEFLOW,
  typeflowOrderComplete: true,
  typesettingPreparationComplete: true,
  typesetterProofComplete: true
} as const;

const COMPLETE_BEFORE_GPO = {
  ...COMPLETE_BEFORE_PUBLICATION_APPARATUS,
  frontMatterAssemblyComplete: true,
  readerAidRegistersComplete: true,
  indexDocketComplete: true,
  typesetterCorrectionsComplete: true,
  kelloggFinalCertificationComplete: true
} as const;

describe("FRUS production board", () => {
  it("keeps the history.state.gov production ladder in a stable order", () => {
    expect(FRUS_PRODUCTION_BOARD_STEPS.map((step) => step.id)).toEqual([
      "series_concept",
      "volume_concept",
      "records_access",
      "research_charter",
      "record_collection",
      "repository_coverage_map",
      "research_selection",
      "source_notes",
      "annotation",
      "manuscript_review",
      "clearance_procedure",
      "eo13526_review",
      "declassification_review",
      "foreign_permissions",
      "withholding_appeals",
      "agency_referrals",
      "advisory_monitoring",
      "editorial_methodology",
      "kellogg_editing",
      "modern_typeflow_order",
      "typesetting_preparation",
      "typesetter_proof",
      "front_matter_assembly",
      "reader_aid_registers",
      "index_docket",
      "typesetter_corrections",
      "kellogg_final_certification",
      "gpo_segment_assembly",
      "gpo_publication",
      "publication_funding",
      "chapter_release_status",
      "digital_release",
      "public_citation",
      "release_calendar",
      "publication_30_year"
    ]);
  });

  it("starts with grand conceptualization active and locks later steps", () => {
    const readout = getFrusProductionBoardReadout(context());

    expect(readout.completed).toBe(0);
    expect(readout.nextStep?.id).toBe("series_concept");
    expect(readout.steps[0].status).toBe("active");
    expect(readout.steps[1].status).toBe("locked");
  });

  it("does not let a 20-year access stamp skip series-wide or volume conceptualization", () => {
    const unplanned = getFrusProductionBoardReadout(context({
      processStamps: ["rule"]
    }));
    const seriesPlanned = getFrusProductionBoardReadout(context({
      processStamps: ["rule"],
      seriesConceptComplete: true
    }));
    const volumePlanned = getFrusProductionBoardReadout(context({
      processStamps: ["rule"],
      seriesConceptComplete: true,
      volumeConceptComplete: true
    }));

    expect(unplanned.nextStep?.id).toBe("series_concept");
    expect(unplanned.steps.find((step) => step.id === "records_access")?.complete).toBe(true);
    expect(seriesPlanned.nextStep?.id).toBe("volume_concept");
    expect(volumePlanned.nextStep?.id).toBe("research_charter");
  });

  it("keeps records access and the scope charter as their own gates after volume conceptualization", () => {
    const missingAccess = getFrusProductionBoardReadout(context({
      seriesConceptComplete: true,
      volumeConceptComplete: true
    }));
    const accessFiled = getFrusProductionBoardReadout(context({
      seriesConceptComplete: true,
      volumeConceptComplete: true,
      recordsAccessComplete: true
    }));
    const charterFiled = getFrusProductionBoardReadout(context({
      seriesConceptComplete: true,
      volumeConceptComplete: true,
      recordsAccessComplete: true,
      researchCharterComplete: true
    }));

    expect(missingAccess.nextStep?.id).toBe("records_access");
    expect(missingAccess.steps.find((step) => step.id === "record_collection")?.status).toBe("locked");
    expect(accessFiled.steps.find((step) => step.id === "records_access")?.complete).toBe(true);
    expect(accessFiled.nextStep?.id).toBe("research_charter");
    expect(accessFiled.steps.find((step) => step.id === "record_collection")?.status).toBe("locked");
    expect(charterFiled.steps.find((step) => step.id === "research_charter")?.complete).toBe(true);
    expect(charterFiled.nextStep?.id).toBe("record_collection");
  });

  it("does not let selected documents skip the collection pass", () => {
    const selectedDocuments = INITIAL_DOCUMENT_CANDIDATES.map(cloneDocumentCandidate);
    selectedDocuments[1] = { ...selectedDocuments[1], selected: true, workflowState: "selected" };
    const readout = getFrusProductionBoardReadout(context({
      processStamps: ["rule"],
      seriesConceptComplete: true,
      volumeConceptComplete: true,
      recordsAccessComplete: true,
      researchCharterComplete: true,
      documentPoints: 20,
      documentCandidates: selectedDocuments
    }));

    expect(readout.nextStep?.id).toBe("record_collection");
    expect(readout.steps.find((step) => step.id === "record_collection")?.complete).toBe(false);
  });

  it("requires the repository coverage map after collection and before selection", () => {
    const mapMissing = getFrusProductionBoardReadout(context({
      processStamps: ["rule"],
      seriesConceptComplete: true,
      volumeConceptComplete: true,
      recordsAccessComplete: true,
      researchCharterComplete: true,
      recordCollectionComplete: true
    }));
    const mapFiled = getFrusProductionBoardReadout(context({
      processStamps: ["rule"],
      seriesConceptComplete: true,
      volumeConceptComplete: true,
      recordsAccessComplete: true,
      researchCharterComplete: true,
      recordCollectionComplete: true,
      repositoryCoverageMapComplete: true
    }));

    expect(mapMissing.nextStep?.id).toBe("repository_coverage_map");
    expect(mapMissing.steps.find((step) => step.id === "research_selection")?.status).toBe("locked");
    expect(mapFiled.steps.find((step) => step.id === "repository_coverage_map")?.complete).toBe(true);
    expect(mapFiled.nextStep?.id).toBe("research_selection");
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
      reliability: 90,
      annotationDraftingComplete: true,
      foreignGovernmentPermissionComplete: true,
      withholdingAppealComplete: true,
      editorialMethodologyComplete: true,
      editorialTreatmentComplete: true,
      typeflowOrderComplete: true,
      typesettingPreparationComplete: true,
      typesetterProofComplete: true,
      frontMatterAssemblyComplete: true,
      readerAidRegistersComplete: true,
      indexDocketComplete: true,
      typesetterCorrectionsComplete: true,
      kelloggFinalCertificationComplete: true,
      gpoSegmentAssemblyComplete: true,
      gpoPublicationComplete: true,
      recordCollectionComplete: true,
      repositoryCoverageMapComplete: true,
      selectionDocketComplete: true,
      seriesConceptComplete: true,
      volumeConceptComplete: true,
      manuscriptReviewComplete: true
    }));
    const fundingFiled = getFrusProductionBoardReadout(context({
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
      reliability: 90,
      annotationDraftingComplete: true,
      foreignGovernmentPermissionComplete: true,
      withholdingAppealComplete: true,
      editorialMethodologyComplete: true,
      editorialTreatmentComplete: true,
      typeflowOrderComplete: true,
      typesettingPreparationComplete: true,
      typesetterProofComplete: true,
      frontMatterAssemblyComplete: true,
      readerAidRegistersComplete: true,
      indexDocketComplete: true,
      typesetterCorrectionsComplete: true,
      kelloggFinalCertificationComplete: true,
      gpoSegmentAssemblyComplete: true,
      gpoPublicationComplete: true,
      publicationFundingComplete: true,
      recordCollectionComplete: true,
      repositoryCoverageMapComplete: true,
      selectionDocketComplete: true,
      seriesConceptComplete: true,
      volumeConceptComplete: true,
      manuscriptReviewComplete: true
    }));

    const chapterStatusIndex = readout.steps.findIndex((step) => step.id === "chapter_release_status");
    expect(chapterStatusIndex).toBeGreaterThan(0);
    expect(readout.nextStep?.id).toBe("publication_funding");
    expect(fundingFiled.steps.slice(0, chapterStatusIndex).every((step) => step.complete)).toBe(true);
    expect(fundingFiled.nextStep?.id).toBe("chapter_release_status");
  });

  it("surfaces modern typeflow, typesetting preparation, and proof before publication apparatus", () => {
    const needsTypeflow = getFrusProductionBoardReadout(context({
      ...COMPLETE_BEFORE_TYPEFLOW
    }));
    const typeflowFiled = getFrusProductionBoardReadout(context({
      ...COMPLETE_BEFORE_TYPEFLOW,
      typeflowOrderComplete: true
    }));
    const prepFiled = getFrusProductionBoardReadout(context({
      ...COMPLETE_BEFORE_TYPEFLOW,
      typeflowOrderComplete: true,
      typesettingPreparationComplete: true
    }));
    const proofFiled = getFrusProductionBoardReadout(context({
      ...COMPLETE_BEFORE_PUBLICATION_APPARATUS
    }));

    expect(needsTypeflow.steps.find((step) => step.id === "kellogg_editing")?.complete).toBe(true);
    expect(needsTypeflow.nextStep?.id).toBe("modern_typeflow_order");
    expect(typeflowFiled.nextStep?.id).toBe("typesetting_preparation");
    expect(prepFiled.nextStep?.id).toBe("typesetter_proof");
    expect(proofFiled.nextStep?.id).toBe("front_matter_assembly");
  });

  it("surfaces front matter, reader aids, index docket, typesetter corrections, and final certification before GPO handoff", () => {
    const needsFrontMatter = getFrusProductionBoardReadout(context({
      ...COMPLETE_BEFORE_PUBLICATION_APPARATUS
    }));
    const frontMatterFiled = getFrusProductionBoardReadout(context({
      ...COMPLETE_BEFORE_PUBLICATION_APPARATUS,
      frontMatterAssemblyComplete: true
    }));
    const readerAidsFiled = getFrusProductionBoardReadout(context({
      ...COMPLETE_BEFORE_PUBLICATION_APPARATUS,
      frontMatterAssemblyComplete: true,
      readerAidRegistersComplete: true
    }));
    const indexFiled = getFrusProductionBoardReadout(context({
      ...COMPLETE_BEFORE_PUBLICATION_APPARATUS,
      frontMatterAssemblyComplete: true,
      readerAidRegistersComplete: true,
      indexDocketComplete: true
    }));
    const correctionsFiled = getFrusProductionBoardReadout(context({
      ...COMPLETE_BEFORE_PUBLICATION_APPARATUS,
      frontMatterAssemblyComplete: true,
      readerAidRegistersComplete: true,
      indexDocketComplete: true,
      typesetterCorrectionsComplete: true
    }));
    const certified = getFrusProductionBoardReadout(context({
      ...COMPLETE_BEFORE_GPO
    }));

    expect(needsFrontMatter.steps.find((step) => step.id === "kellogg_editing")?.complete).toBe(true);
    expect(needsFrontMatter.nextStep?.id).toBe("front_matter_assembly");
    expect(frontMatterFiled.nextStep?.id).toBe("reader_aid_registers");
    expect(readerAidsFiled.nextStep?.id).toBe("index_docket");
    expect(indexFiled.nextStep?.id).toBe("typesetter_corrections");
    expect(correctionsFiled.nextStep?.id).toBe("kellogg_final_certification");
    expect(certified.nextStep?.id).toBe("gpo_segment_assembly");
  });

  it("surfaces GPO segment assembly, handoff, and funding queue before public chapter status", () => {
    const readyForGpo = getFrusProductionBoardReadout(context({
      ...COMPLETE_BEFORE_GPO
    }));
    const segmentsComplete = getFrusProductionBoardReadout(context({
      ...COMPLETE_BEFORE_GPO,
      gpoSegmentAssemblyComplete: true
    }));
    const handoffComplete = getFrusProductionBoardReadout(context({
      ...COMPLETE_BEFORE_GPO,
      gpoSegmentAssemblyComplete: true,
      gpoPublicationComplete: true
    }));
    const fundingComplete = getFrusProductionBoardReadout(context({
      ...COMPLETE_BEFORE_GPO,
      gpoSegmentAssemblyComplete: true,
      gpoPublicationComplete: true,
      publicationFundingComplete: true
    }));

    expect(readyForGpo.steps.find((step) => step.id === "kellogg_editing")?.complete).toBe(true);
    expect(readyForGpo.nextStep?.id).toBe("gpo_segment_assembly");
    expect(readyForGpo.steps.find((step) => step.id === "chapter_release_status")?.status).toBe("locked");
    expect(segmentsComplete.nextStep?.id).toBe("gpo_publication");
    expect(handoffComplete.steps.find((step) => step.id === "gpo_publication")?.complete).toBe(true);
    expect(handoffComplete.nextStep?.id).toBe("publication_funding");
    expect(fundingComplete.steps.find((step) => step.id === "publication_funding")?.complete).toBe(true);
    expect(fundingComplete.nextStep?.id).toBe("chapter_release_status");
  });

  it("requires foreign-government permission after declassification and before referral concurrence", () => {
    const documents = INITIAL_DOCUMENT_CANDIDATES.map(cloneDocumentCandidate);
    documents[4] = {
      ...withEquityResolved(documents[4]),
      workflowState: "referred"
    };
    const missingPermission = getFrusProductionBoardReadout(context({
      volumeWorkflowState: "declassification_review",
      processStamps: ["rule", "archive", "network"],
      documentCandidates: documents,
      heldProcessItems: new Set<ProcessItemId>(["citation_stamp", "clearance_token"]),
      documentPoints: 50,
      annotationDraftingComplete: true,
      recordCollectionComplete: true,
      repositoryCoverageMapComplete: true,
      seriesConceptComplete: true,
      volumeConceptComplete: true,
      manuscriptReviewComplete: true
    }));
    const permissionFiled = getFrusProductionBoardReadout(context({
      volumeWorkflowState: "declassification_review",
      processStamps: ["rule", "archive", "network"],
      documentCandidates: documents,
      heldProcessItems: new Set<ProcessItemId>(["citation_stamp", "clearance_token"]),
      documentPoints: 50,
      annotationDraftingComplete: true,
      foreignGovernmentPermissionComplete: true,
      withholdingAppealComplete: true,
      editorialTreatmentComplete: true,
      recordCollectionComplete: true,
      repositoryCoverageMapComplete: true,
      seriesConceptComplete: true,
      volumeConceptComplete: true,
      manuscriptReviewComplete: true
    }));

    expect(missingPermission.steps.find((step) => step.id === "declassification_review")?.complete).toBe(true);
    expect(missingPermission.nextStep?.id).toBe("foreign_permissions");
    expect(missingPermission.steps.find((step) => step.id === "advisory_monitoring")?.status).toBe("locked");
    expect(permissionFiled.steps.find((step) => step.id === "foreign_permissions")?.complete).toBe(true);
    expect(permissionFiled.nextStep?.id).toBe("advisory_monitoring");
  });

  it("requires withholding appeal review after foreign-government permission and before concurrence", () => {
    const documents = INITIAL_DOCUMENT_CANDIDATES.map(cloneDocumentCandidate);
    documents[4] = {
      ...withEquityResolved(documents[4]),
      workflowState: "referred"
    };
    const missingAppeal = getFrusProductionBoardReadout(context({
      volumeWorkflowState: "declassification_review",
      processStamps: ["rule", "archive", "network"],
      documentCandidates: documents,
      heldProcessItems: new Set<ProcessItemId>(["citation_stamp", "clearance_token"]),
      documentPoints: 50,
      annotationDraftingComplete: true,
      foreignGovernmentPermissionComplete: true,
      recordCollectionComplete: true,
      repositoryCoverageMapComplete: true,
      seriesConceptComplete: true,
      volumeConceptComplete: true,
      manuscriptReviewComplete: true
    }));
    const appealFiled = getFrusProductionBoardReadout(context({
      volumeWorkflowState: "declassification_review",
      processStamps: ["rule", "archive", "network"],
      documentCandidates: documents,
      heldProcessItems: new Set<ProcessItemId>(["citation_stamp", "clearance_token"]),
      documentPoints: 50,
      annotationDraftingComplete: true,
      foreignGovernmentPermissionComplete: true,
      withholdingAppealComplete: true,
      editorialTreatmentComplete: true,
      recordCollectionComplete: true,
      repositoryCoverageMapComplete: true,
      seriesConceptComplete: true,
      volumeConceptComplete: true,
      manuscriptReviewComplete: true
    }));

    expect(missingAppeal.steps.find((step) => step.id === "foreign_permissions")?.complete).toBe(true);
    expect(missingAppeal.nextStep?.id).toBe("withholding_appeals");
    expect(missingAppeal.steps.find((step) => step.id === "advisory_monitoring")?.status).toBe("locked");
    expect(appealFiled.steps.find((step) => step.id === "withholding_appeals")?.complete).toBe(true);
    expect(appealFiled.nextStep?.id).toBe("advisory_monitoring");
  });

  it("requires annotation drafting after source-note provenance and before manuscript review", () => {
    const documents = INITIAL_DOCUMENT_CANDIDATES.map(cloneDocumentCandidate);
    documents[2] = {
      ...documents[2],
      workflowState: "annotation_needed",
      citationComplete: true,
      annotationNeeded: true
    };
    const notAnnotated = getFrusProductionBoardReadout(context({
      processStamps: ["rule", "archive"],
      documentCandidates: documents,
      heldProcessItems: new Set<ProcessItemId>(["citation_stamp"]),
      documentPoints: 24,
      recordCollectionComplete: true,
      repositoryCoverageMapComplete: true,
      seriesConceptComplete: true,
      volumeConceptComplete: true
    }));
    const annotated = getFrusProductionBoardReadout(context({
      processStamps: ["rule", "archive"],
      documentCandidates: documents,
      heldProcessItems: new Set<ProcessItemId>(["citation_stamp"]),
      documentPoints: 24,
      annotationDraftingComplete: true,
      recordCollectionComplete: true,
      repositoryCoverageMapComplete: true,
      seriesConceptComplete: true,
      volumeConceptComplete: true
    }));

    expect(notAnnotated.steps.find((step) => step.id === "source_notes")?.complete).toBe(true);
    expect(notAnnotated.nextStep?.id).toBe("annotation");
    expect(notAnnotated.steps.find((step) => step.id === "manuscript_review")?.status).toBe("locked");
    expect(annotated.steps.find((step) => step.id === "annotation")?.complete).toBe(true);
    expect(annotated.nextStep?.id).toBe("manuscript_review");
  });

  it("requires explicit manuscript review before the clearance procedure lane opens", () => {
    const documents = INITIAL_DOCUMENT_CANDIDATES.map(cloneDocumentCandidate);
    documents[2] = {
      ...documents[2],
      workflowState: "citation_verified",
      citationComplete: true
    };
    const unreviewed = getFrusProductionBoardReadout(context({
      processStamps: ["rule", "archive"],
      documentCandidates: documents,
      heldProcessItems: new Set<ProcessItemId>(["citation_stamp"]),
      documentPoints: 20,
      annotationDraftingComplete: true,
      recordCollectionComplete: true,
      repositoryCoverageMapComplete: true,
      seriesConceptComplete: true,
      volumeConceptComplete: true
    }));
    const reviewed = getFrusProductionBoardReadout(context({
      processStamps: ["rule", "archive"],
      documentCandidates: documents,
      heldProcessItems: new Set<ProcessItemId>(["citation_stamp"]),
      documentPoints: 20,
      annotationDraftingComplete: true,
      recordCollectionComplete: true,
      repositoryCoverageMapComplete: true,
      seriesConceptComplete: true,
      volumeConceptComplete: true,
      manuscriptReviewComplete: true
    }));

    expect(unreviewed.nextStep?.id).toBe("manuscript_review");
    expect(unreviewed.steps.find((step) => step.id === "clearance_procedure")?.status).toBe("locked");
    expect(reviewed.steps.find((step) => step.id === "manuscript_review")?.complete).toBe(true);
    expect(reviewed.nextStep?.id).toBe("clearance_procedure");
  });

  it("requires clearance procedure and E.O. 13526 review before the declassification token gate", () => {
    const documents = INITIAL_DOCUMENT_CANDIDATES.map(cloneDocumentCandidate);
    documents[2] = {
      ...documents[2],
      workflowState: "citation_verified",
      citationComplete: true
    };
    const needsLane = getFrusProductionBoardReadout(context({
      processStamps: ["rule", "archive"],
      documentCandidates: documents,
      heldProcessItems: new Set<ProcessItemId>(["citation_stamp"]),
      documentPoints: 20,
      annotationDraftingComplete: true,
      recordCollectionComplete: true,
      repositoryCoverageMapComplete: true,
      seriesConceptComplete: true,
      volumeConceptComplete: true,
      manuscriptReviewComplete: true
    }));
    const needsEo = getFrusProductionBoardReadout(context({
      processStamps: ["rule", "archive"],
      documentCandidates: documents,
      heldProcessItems: new Set<ProcessItemId>(["citation_stamp"]),
      documentPoints: 20,
      annotationDraftingComplete: true,
      recordCollectionComplete: true,
      repositoryCoverageMapComplete: true,
      seriesConceptComplete: true,
      volumeConceptComplete: true,
      manuscriptReviewComplete: true,
      clearanceProcedureComplete: true
    }));
    const needsDecision = getFrusProductionBoardReadout(context({
      processStamps: ["rule", "archive"],
      documentCandidates: documents,
      heldProcessItems: new Set<ProcessItemId>(["citation_stamp"]),
      documentPoints: 20,
      annotationDraftingComplete: true,
      recordCollectionComplete: true,
      repositoryCoverageMapComplete: true,
      seriesConceptComplete: true,
      volumeConceptComplete: true,
      manuscriptReviewComplete: true,
      clearanceProcedureComplete: true,
      eo13526ReviewComplete: true
    }));

    expect(needsLane.nextStep?.id).toBe("clearance_procedure");
    expect(needsEo.steps.find((step) => step.id === "clearance_procedure")?.complete).toBe(true);
    expect(needsEo.nextStep?.id).toBe("eo13526_review");
    expect(needsDecision.steps.find((step) => step.id === "eo13526_review")?.complete).toBe(true);
    expect(needsDecision.nextStep?.id).toBe("declassification_review");
  });

  it("can complete HAC monitoring through the hearing even before the SOP stamp", () => {
    const readout = getFrusProductionBoardReadout(context({
      processStamps: ["rule", "archive", "network", "referral"],
      hacReviewComplete: true,
      annotationDraftingComplete: true,
      foreignGovernmentPermissionComplete: true,
      withholdingAppealComplete: true,
      recordCollectionComplete: true,
      repositoryCoverageMapComplete: true,
      seriesConceptComplete: true,
      volumeConceptComplete: true
    }));

    expect(readout.steps.find((step) => step.id === "advisory_monitoring")?.complete).toBe(true);
  });

  it("does not complete research selection from charter points alone", () => {
    const charterOnly = getFrusProductionBoardReadout(context({
      processStamps: ["rule"],
      documentPoints: 6,
      annotationDraftingComplete: true,
      recordCollectionComplete: true,
      repositoryCoverageMapComplete: true,
      seriesConceptComplete: true,
      volumeConceptComplete: true
    }));
    const selectedDocuments = INITIAL_DOCUMENT_CANDIDATES.map(cloneDocumentCandidate);
    selectedDocuments[1] = { ...selectedDocuments[1], selected: true, workflowState: "selected" };
    const partialSelection = getFrusProductionBoardReadout(context({
      processStamps: ["rule"],
      documentPoints: 20,
      annotationDraftingComplete: true,
      recordCollectionComplete: true,
      repositoryCoverageMapComplete: true,
      seriesConceptComplete: true,
      volumeConceptComplete: true,
      documentCandidates: selectedDocuments
    }));
    const balancedDocuments = INITIAL_DOCUMENT_CANDIDATES.map(cloneDocumentCandidate);
    for (const id of ["telegram_001", "source_note_047", "sbu_annotation_001", "proof_page_412"]) {
      const index = balancedDocuments.findIndex((document) => document.id === id);
      balancedDocuments[index] = { ...balancedDocuments[index], selected: true, workflowState: "selected" };
    }
    const selectedReadout = getFrusProductionBoardReadout(context({
      processStamps: ["rule"],
      documentPoints: 20,
      annotationDraftingComplete: true,
      recordCollectionComplete: true,
      repositoryCoverageMapComplete: true,
      seriesConceptComplete: true,
      volumeConceptComplete: true,
      documentCandidates: balancedDocuments
    }));
    const docketReadout = getFrusProductionBoardReadout(context({
      processStamps: ["rule"],
      documentPoints: 20,
      annotationDraftingComplete: true,
      recordCollectionComplete: true,
      repositoryCoverageMapComplete: true,
      selectionDocketComplete: true,
      seriesConceptComplete: true,
      volumeConceptComplete: true,
      documentCandidates: balancedDocuments
    }));

    expect(charterOnly.steps.find((step) => step.id === "records_access")?.complete).toBe(true);
    expect(charterOnly.steps.find((step) => step.id === "research_selection")?.complete).toBe(false);
    expect(partialSelection.researchCoverage.complete).toBe(false);
    expect(partialSelection.steps.find((step) => step.id === "research_selection")?.complete).toBe(false);
    expect(selectedReadout.researchCoverage.complete).toBe(true);
    expect(selectedReadout.steps.find((step) => step.id === "research_selection")?.complete).toBe(false);
    expect(docketReadout.researchCoverage.complete).toBe(true);
    expect(docketReadout.steps.find((step) => step.id === "research_selection")?.complete).toBe(true);
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
      editorialMethodologyComplete: true,
      editorialTreatmentComplete: true,
      reliability: 90
    });

    expect(isFrusProductionBoardStepComplete("kellogg_editing", boardContext)).toBe(false);
  });

  it("requires editorial treatment before proof stamp can satisfy Kellogg editing", () => {
    const unstamped = context({
      processStamps: [],
      editorialMethodologyComplete: true,
      editorialTreatmentComplete: true,
      reliability: 90
    });
    const unconsulted = context({
      processStamps: ["proof"],
      editorialMethodologyComplete: true,
      reliability: 90
    });
    const missingMethod = context({
      processStamps: ["proof"],
      editorialTreatmentComplete: true,
      reliability: 90
    });
    const consulted = context({
      processStamps: ["proof"],
      editorialMethodologyComplete: true,
      editorialTreatmentComplete: true,
      reliability: 90
    });

    expect(isFrusProductionBoardStepComplete("kellogg_editing", unstamped)).toBe(false);
    expect(isFrusProductionBoardStepComplete("kellogg_editing", unconsulted)).toBe(false);
    expect(isFrusProductionBoardStepComplete("kellogg_editing", missingMethod)).toBe(false);
    expect(isFrusProductionBoardStepComplete("editorial_methodology", missingMethod)).toBe(false);
    expect(isFrusProductionBoardStepComplete("kellogg_editing", consulted)).toBe(true);
  });

  it("requires front matter, certification, GPO, funding queue, chapter status, digital release, public citation, and release calendar before statutory publication", () => {
    const documents = INITIAL_DOCUMENT_CANDIDATES.map(withEquityResolved);
    const notReady = context({
      processStamps: ["rule", "archive", "sop", "proof"],
      documentCandidates: documents,
      heldProcessItems: new Set<ProcessItemId>(["buckram_key"]),
      volumeFragments: ["A", "B", "C", "D"],
      reliability: 90,
      researchCharterComplete: true,
      volumeWorkflowState: "final_assembly" as VolumeWorkflowState
    });
    const ready = context({
      ...notReady,
      volumeFragments: ["A", "B", "C", "D", "E"],
      repositoryCoverageMapComplete: true,
      clearanceProcedureComplete: true,
      eo13526ReviewComplete: true
    });
    const typeflowFiled = context({
      ...ready,
      typeflowOrderComplete: true
    });
    const typesetterProofFiled = context({
      ...typeflowFiled,
      typesettingPreparationComplete: true,
      typesetterProofComplete: true
    });
    const frontMatterFiled = context({
      ...typesetterProofFiled,
      frontMatterAssemblyComplete: true
    });
    const readerAidsFiled = context({
      ...frontMatterFiled,
      readerAidRegistersComplete: true
    });
    const indexDocketFiled = context({
      ...readerAidsFiled,
      indexDocketComplete: true
    });
    const correctionsFiled = context({
      ...indexDocketFiled,
      typesetterCorrectionsComplete: true
    });
    const certified = context({
      ...correctionsFiled,
      kelloggFinalCertificationComplete: true
    });
    const gpoSegmentsFiled = context({
      ...certified,
      gpoSegmentAssemblyComplete: true
    });
    const gpoHandoffFiled = context({
      ...gpoSegmentsFiled,
      gpoPublicationComplete: true
    });
    const fundingQueueFiled = context({
      ...gpoHandoffFiled,
      publicationFundingComplete: true
    });
    const chapterLedgerFiled = context({
      ...fundingQueueFiled,
      chapterReleaseComplete: true
    });
    const digitallyReleased = context({
      ...chapterLedgerFiled,
      digitalReleaseComplete: true
    });
    const citationFiled = context({
      ...digitallyReleased,
      publicCitationComplete: true
    });
    const releaseDocketFiled = context({
      ...citationFiled,
      releaseCalendarComplete: true
    });

    expect(isFrusProductionBoardStepComplete("publication_30_year", notReady)).toBe(false);
    expect(isFrusProductionBoardStepComplete("chapter_release_status", ready)).toBe(false);
    expect(isFrusProductionBoardStepComplete("digital_release", ready)).toBe(false);
    expect(isFrusProductionBoardStepComplete("public_citation", ready)).toBe(false);
    expect(isFrusProductionBoardStepComplete("release_calendar", ready)).toBe(false);
    expect(isFrusProductionBoardStepComplete("modern_typeflow_order", typeflowFiled)).toBe(true);
    expect(isFrusProductionBoardStepComplete("publication_30_year", typeflowFiled)).toBe(false);
    expect(isFrusProductionBoardStepComplete("typesetting_preparation", typesetterProofFiled)).toBe(true);
    expect(isFrusProductionBoardStepComplete("typesetter_proof", typesetterProofFiled)).toBe(true);
    expect(isFrusProductionBoardStepComplete("publication_30_year", typesetterProofFiled)).toBe(false);
    expect(isFrusProductionBoardStepComplete("front_matter_assembly", frontMatterFiled)).toBe(true);
    expect(isFrusProductionBoardStepComplete("publication_30_year", frontMatterFiled)).toBe(false);
    expect(isFrusProductionBoardStepComplete("reader_aid_registers", frontMatterFiled)).toBe(false);
    expect(isFrusProductionBoardStepComplete("reader_aid_registers", readerAidsFiled)).toBe(true);
    expect(isFrusProductionBoardStepComplete("publication_30_year", readerAidsFiled)).toBe(false);
    expect(isFrusProductionBoardStepComplete("index_docket", indexDocketFiled)).toBe(true);
    expect(isFrusProductionBoardStepComplete("publication_30_year", indexDocketFiled)).toBe(false);
    expect(isFrusProductionBoardStepComplete("typesetter_corrections", correctionsFiled)).toBe(true);
    expect(isFrusProductionBoardStepComplete("publication_30_year", correctionsFiled)).toBe(false);
    expect(isFrusProductionBoardStepComplete("kellogg_final_certification", certified)).toBe(true);
    expect(isFrusProductionBoardStepComplete("publication_30_year", certified)).toBe(false);
    expect(isFrusProductionBoardStepComplete("gpo_segment_assembly", gpoSegmentsFiled)).toBe(true);
    expect(isFrusProductionBoardStepComplete("publication_30_year", gpoSegmentsFiled)).toBe(false);
    expect(isFrusProductionBoardStepComplete("gpo_publication", gpoHandoffFiled)).toBe(true);
    expect(isFrusProductionBoardStepComplete("publication_funding", gpoHandoffFiled)).toBe(false);
    expect(isFrusProductionBoardStepComplete("publication_30_year", gpoHandoffFiled)).toBe(false);
    expect(isFrusProductionBoardStepComplete("publication_funding", fundingQueueFiled)).toBe(true);
    expect(isFrusProductionBoardStepComplete("publication_30_year", fundingQueueFiled)).toBe(false);
    expect(isFrusProductionBoardStepComplete("chapter_release_status", chapterLedgerFiled)).toBe(true);
    expect(isFrusProductionBoardStepComplete("digital_release", chapterLedgerFiled)).toBe(false);
    expect(isFrusProductionBoardStepComplete("publication_30_year", ready)).toBe(false);
    expect(isFrusProductionBoardStepComplete("digital_release", digitallyReleased)).toBe(true);
    expect(isFrusProductionBoardStepComplete("public_citation", digitallyReleased)).toBe(false);
    expect(isFrusProductionBoardStepComplete("publication_30_year", digitallyReleased)).toBe(false);
    expect(isFrusProductionBoardStepComplete("public_citation", citationFiled)).toBe(true);
    expect(isFrusProductionBoardStepComplete("release_calendar", citationFiled)).toBe(false);
    expect(isFrusProductionBoardStepComplete("publication_30_year", citationFiled)).toBe(false);
    expect(isFrusProductionBoardStepComplete("release_calendar", releaseDocketFiled)).toBe(true);
    expect(isFrusProductionBoardStepComplete("publication_30_year", releaseDocketFiled)).toBe(true);
  });
});
