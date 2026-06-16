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
    manuscriptReviewComplete: false,
    recordsAccessComplete: false,
    recordCollectionComplete: false,
    selectionDocketComplete: false,
    seriesConceptComplete: false,
    volumeConceptComplete: false,
    chapterReleaseComplete: false,
    digitalReleaseComplete: false,
    publicCitationComplete: false,
    releaseCalendarComplete: false,
    gpoSegmentAssemblyComplete: false,
    gpoPublicationComplete: false,
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

const COMPLETE_BEFORE_GPO = {
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
  recordsAccessComplete: true,
  recordCollectionComplete: true,
  selectionDocketComplete: true,
  seriesConceptComplete: true,
  volumeConceptComplete: true
} as const;

describe("FRUS production board", () => {
  it("keeps the history.state.gov production ladder in a stable order", () => {
    expect(FRUS_PRODUCTION_BOARD_STEPS.map((step) => step.id)).toEqual([
      "series_concept",
      "volume_concept",
      "records_access",
      "record_collection",
      "research_selection",
      "source_notes",
      "annotation",
      "manuscript_review",
      "declassification_review",
      "foreign_permissions",
      "withholding_appeals",
      "agency_referrals",
      "advisory_monitoring",
      "editorial_methodology",
      "kellogg_editing",
      "gpo_segment_assembly",
      "gpo_publication",
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
    expect(volumePlanned.nextStep?.id).toBe("record_collection");
  });

  it("keeps records access as its own gate after volume conceptualization", () => {
    const missingAccess = getFrusProductionBoardReadout(context({
      seriesConceptComplete: true,
      volumeConceptComplete: true
    }));
    const accessFiled = getFrusProductionBoardReadout(context({
      seriesConceptComplete: true,
      volumeConceptComplete: true,
      recordsAccessComplete: true
    }));

    expect(missingAccess.nextStep?.id).toBe("records_access");
    expect(missingAccess.steps.find((step) => step.id === "record_collection")?.status).toBe("locked");
    expect(accessFiled.steps.find((step) => step.id === "records_access")?.complete).toBe(true);
    expect(accessFiled.nextStep?.id).toBe("record_collection");
  });

  it("does not let selected documents skip the collection pass", () => {
    const selectedDocuments = INITIAL_DOCUMENT_CANDIDATES.map(cloneDocumentCandidate);
    selectedDocuments[1] = { ...selectedDocuments[1], selected: true, workflowState: "selected" };
    const readout = getFrusProductionBoardReadout(context({
      processStamps: ["rule"],
      seriesConceptComplete: true,
      volumeConceptComplete: true,
      documentPoints: 20,
      documentCandidates: selectedDocuments
    }));

    expect(readout.nextStep?.id).toBe("record_collection");
    expect(readout.steps.find((step) => step.id === "record_collection")?.complete).toBe(false);
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
      gpoSegmentAssemblyComplete: true,
      gpoPublicationComplete: true,
      recordCollectionComplete: true,
      selectionDocketComplete: true,
      seriesConceptComplete: true,
      volumeConceptComplete: true,
      manuscriptReviewComplete: true
    }));

    expect(readout.steps.slice(0, 17).every((step) => step.complete)).toBe(true);
    expect(readout.nextStep?.id).toBe("chapter_release_status");
  });

  it("surfaces GPO segment assembly and handoff before public chapter status", () => {
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

    expect(readyForGpo.steps.find((step) => step.id === "kellogg_editing")?.complete).toBe(true);
    expect(readyForGpo.nextStep?.id).toBe("gpo_segment_assembly");
    expect(readyForGpo.steps.find((step) => step.id === "chapter_release_status")?.status).toBe("locked");
    expect(segmentsComplete.nextStep?.id).toBe("gpo_publication");
    expect(handoffComplete.steps.find((step) => step.id === "gpo_publication")?.complete).toBe(true);
    expect(handoffComplete.nextStep?.id).toBe("chapter_release_status");
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
      seriesConceptComplete: true,
      volumeConceptComplete: true
    }));

    expect(notAnnotated.steps.find((step) => step.id === "source_notes")?.complete).toBe(true);
    expect(notAnnotated.nextStep?.id).toBe("annotation");
    expect(notAnnotated.steps.find((step) => step.id === "manuscript_review")?.status).toBe("locked");
    expect(annotated.steps.find((step) => step.id === "annotation")?.complete).toBe(true);
    expect(annotated.nextStep?.id).toBe("manuscript_review");
  });

  it("requires explicit manuscript review before the declassification board step opens", () => {
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
      seriesConceptComplete: true,
      volumeConceptComplete: true,
      manuscriptReviewComplete: true
    }));

    expect(unreviewed.nextStep?.id).toBe("manuscript_review");
    expect(unreviewed.steps.find((step) => step.id === "declassification_review")?.status).toBe("locked");
    expect(reviewed.steps.find((step) => step.id === "manuscript_review")?.complete).toBe(true);
    expect(reviewed.nextStep?.id).toBe("declassification_review");
  });

  it("can complete HAC monitoring through the hearing even before the SOP stamp", () => {
    const readout = getFrusProductionBoardReadout(context({
      processStamps: ["rule", "archive", "network", "referral"],
      hacReviewComplete: true,
      annotationDraftingComplete: true,
      foreignGovernmentPermissionComplete: true,
      withholdingAppealComplete: true,
      recordCollectionComplete: true,
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
      seriesConceptComplete: true,
      volumeConceptComplete: true,
      documentCandidates: balancedDocuments
    }));
    const docketReadout = getFrusProductionBoardReadout(context({
      processStamps: ["rule"],
      documentPoints: 20,
      annotationDraftingComplete: true,
      recordCollectionComplete: true,
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

  it("requires chapter status, digital release, public citation, and release calendar before statutory publication", () => {
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
    const chapterLedgerFiled = context({
      ...ready,
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
