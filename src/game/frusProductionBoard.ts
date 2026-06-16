import type { ProcessItemId, ProcessStampId } from "./constants";
import type { DocumentCandidate, ReviewStatus, VolumeWorkflowState } from "./types";
import { ANNOTATION_DRAFTING_SOURCE_URL } from "./annotationDrafting";
import { CHAPTER_RELEASE_STATUS_SOURCE_URL } from "./chapterReleaseStatus";
import { DIGITAL_RELEASE_SOURCE_URL } from "./digitalRelease";
import { EDITORIAL_METHODOLOGY_SOURCE_URL } from "./editorialMethodology";
import { EDITORIAL_TREATMENT_SOURCE_URL } from "./editorialTreatment";
import { EO13526_REVIEW_SOURCE_URL } from "./eo13526Review";
import { FOREIGN_GOVERNMENT_PERMISSION_SOURCE_URL } from "./foreignGovernmentPermission";
import { buckramGateOpen, crystalsEarned, totalEquities } from "./frusProgression";
import { GPO_PUBLICATION_SOURCE_URL } from "./gpoPublication";
import { GPO_SEGMENT_ASSEMBLY_SOURCE_URL } from "./gpoSegmentAssembly";
import { getResearchCoverageReadout, researchCoverageComplete, type ResearchCoverageReadout } from "./researchCoverage";
import { PUBLIC_CITATION_CARD_SOURCE_URL } from "./publicCitationCard";
import { RECORD_COLLECTION_SOURCE_URL } from "./recordCollection";
import { RECORDS_ACCESS_SOURCE_URL } from "./recordsAccess";
import { RELEASE_CALENDAR_SOURCE_URL } from "./releaseCalendar";
import { SELECTION_DOCKET_SOURCE_URL } from "./selectionDocket";
import { SERIES_CONCEPT_SOURCE_URL } from "./seriesConcept";
import { VOLUME_CONCEPT_SOURCE_URL } from "./volumeConcept";
import { WITHHOLDING_APPEAL_SOURCE_URL } from "./withholdingAppeal";

export type FrusProductionBoardStepId =
  | "series_concept"
  | "volume_concept"
  | "records_access"
  | "record_collection"
  | "research_selection"
  | "source_notes"
  | "annotation"
  | "manuscript_review"
  | "declassification_review"
  | "foreign_permissions"
  | "withholding_appeals"
  | "agency_referrals"
  | "advisory_monitoring"
  | "editorial_methodology"
  | "kellogg_editing"
  | "gpo_segment_assembly"
  | "gpo_publication"
  | "chapter_release_status"
  | "digital_release"
  | "public_citation"
  | "release_calendar"
  | "publication_30_year";

export type FrusProductionBoardStatus = "complete" | "active" | "locked";

export interface FrusProductionBoardContext {
  volumeWorkflowState: VolumeWorkflowState;
  documentCandidates: readonly DocumentCandidate[];
  processStamps: readonly ProcessStampId[];
  heldProcessItems: ReadonlySet<ProcessItemId>;
  documentPoints: number;
  reliability: number;
  volumeFragments: readonly string[];
  finalGatePublished: boolean;
  hacReviewComplete: boolean;
  annotationDraftingComplete: boolean;
  foreignGovernmentPermissionComplete: boolean;
  withholdingAppealComplete: boolean;
  editorialMethodologyComplete: boolean;
  editorialTreatmentComplete: boolean;
  manuscriptReviewComplete: boolean;
  recordsAccessComplete: boolean;
  recordCollectionComplete: boolean;
  selectionDocketComplete: boolean;
  seriesConceptComplete: boolean;
  volumeConceptComplete: boolean;
  chapterReleaseComplete: boolean;
  digitalReleaseComplete: boolean;
  publicCitationComplete: boolean;
  releaseCalendarComplete: boolean;
  gpoSegmentAssemblyComplete: boolean;
  gpoPublicationComplete: boolean;
}

export interface FrusProductionBoardStep {
  id: FrusProductionBoardStepId;
  label: string;
  shortLabel: string;
  sourceBasis: string;
  sourceUrl: string;
  gameplayTask: string;
}

export interface FrusProductionBoardStepReadout extends FrusProductionBoardStep {
  status: FrusProductionBoardStatus;
  complete: boolean;
  locked: boolean;
}

export interface FrusProductionBoardReadout {
  completed: number;
  total: number;
  nextStep: FrusProductionBoardStepReadout | null;
  steps: FrusProductionBoardStepReadout[];
  sourceUrls: string[];
  researchCoverage: ResearchCoverageReadout;
}

const ABOUT_FRUS_URL = "https://history.state.gov/historicaldocuments/about-frus";
const HAC_URL = "https://history.state.gov/about/hac/intro";
const FRUS_STAGES_URL = "https://history.state.gov/historicaldocuments/frus-history/stages";

export const FRUS_PRODUCTION_BOARD_STEPS = [
  {
    id: "series_concept",
    label: "Grand conceptualization",
    shortLabel: "GRD",
    sourceBasis: "FRUS work begins with an organizational scheme for the series as a whole.",
    sourceUrl: SERIES_CONCEPT_SOURCE_URL,
    gameplayTask: "File the whole-series plan at the Scope / Selection Desk before drafting the volume charter."
  },
  {
    id: "volume_concept",
    label: "Volume conceptualization",
    shortLabel: "VOL",
    sourceBasis: "Compilers determine the parameters of the individual volume and use contextual accounts to shape collection and selection.",
    sourceUrl: VOLUME_CONCEPT_SOURCE_URL,
    gameplayTask: "Define the volume remit and strategy sources at the Scope / Selection Desk."
  },
  {
    id: "records_access",
    label: "20-year records access",
    shortLabel: "20Y",
    sourceBasis: "OH historians get full and complete access to pertinent records at 20 years.",
    sourceUrl: RECORDS_ACCESS_SOURCE_URL,
    gameplayTask: "File the 20-year access authorization before the Scope Charter opens collection."
  },
  {
    id: "record_collection",
    label: "Collection",
    shortLabel: "COL",
    sourceBasis: "Compilers identify important records, search for them, and copy or note records for publication or context.",
    sourceUrl: RECORD_COLLECTION_SOURCE_URL,
    gameplayTask: "File the archive collection pass before choosing the final candidate set."
  },
  {
    id: "research_selection",
    label: "Selection docket",
    shortLabel: "SEL",
    sourceBasis: "Selection narrows collected records into a printed subset, while expanded annotation mitigates the series' selectivity.",
    sourceUrl: SELECTION_DOCKET_SOURCE_URL,
    gameplayTask: "Select a balanced candidate set and file the visible rationale for the printed subset."
  },
  {
    id: "source_notes",
    label: "Source-note provenance",
    shortLabel: "SRC",
    sourceBasis: "FRUS must be thorough, accurate, and reliable across the national security record.",
    sourceUrl: ABOUT_FRUS_URL,
    gameplayTask: "Verify Source Note 47 at the research table with the Citation Stamp."
  },
  {
    id: "annotation",
    label: "Annotation drafting",
    shortLabel: "ANN",
    sourceBasis: "Annotation provides provenance plus context about persons, events, policies, references, and attachments.",
    sourceUrl: ANNOTATION_DRAFTING_SOURCE_URL,
    gameplayTask: "Draft expanded annotations at the research table before manuscript review."
  },
  {
    id: "manuscript_review",
    label: "Manuscript review",
    shortLabel: "REV",
    sourceBasis: "FRUS manuscripts receive human review for completeness, cohesion, concision, content appropriateness, and annotation accuracy.",
    sourceUrl: FRUS_STAGES_URL,
    gameplayTask: "Run the FRUS Cart manuscript review: first-pass recommendations, then series assessment."
  },
  {
    id: "declassification_review",
    label: "Declassification review",
    shortLabel: "DEC",
    sourceBasis: "E.O. 13526 review releases all information subject only to current national security requirements, with concurrence and visible accounting.",
    sourceUrl: EO13526_REVIEW_SOURCE_URL,
    gameplayTask: "Route OpenNet/ClassNet issues, apply the release standard, and earn the Clearance Token."
  },
  {
    id: "foreign_permissions",
    label: "Foreign-government permission",
    shortLabel: "FGP",
    sourceBasis: "Foreign-government information selected for publication may require permission before the volume proceeds.",
    sourceUrl: FOREIGN_GOVERNMENT_PERMISSION_SOURCE_URL,
    gameplayTask: "Flag foreign-government information and preserve a visible permission or withholding note."
  },
  {
    id: "withholding_appeals",
    label: "Withholding and appeal review",
    shortLabel: "APP",
    sourceBasis: "Declassification review may withhold whole documents or excise portions; contested withholding needs a visible review outcome.",
    sourceUrl: WITHHOLDING_APPEAL_SOURCE_URL,
    gameplayTask: "Route the whole-document withholding appeal before marking partial excisions."
  },
  {
    id: "agency_referrals",
    label: "Agency referrals",
    shortLabel: "REF",
    sourceBasis: "HAC advises on preparation and declassification; agency equities must resolve cleanly.",
    sourceUrl: HAC_URL,
    gameplayTask: "Resolve every distinct agency equity and earn Concurrence."
  },
  {
    id: "advisory_monitoring",
    label: "HAC and process monitoring",
    shortLabel: "HAC",
    sourceBasis: "HAC monitors the overall compilation, editorial, preparation, and declassification process.",
    sourceUrl: HAC_URL,
    gameplayTask: "Run the SOP review: StateChat may flag mechanics, but humans decide evidence-bound issues."
  },
  {
    id: "editorial_methodology",
    label: "Editorial methodology ledger",
    shortLabel: "MTH",
    sourceBasis: "The About-the-Series methodology fixes chronology, transcription, source-note metadata, and annotation rules before final treatment.",
    sourceUrl: EDITORIAL_METHODOLOGY_SOURCE_URL,
    gameplayTask: "File the methodology ledger: Washington-time order, exact transcription, source-footnote metadata, and editorial-note context."
  },
  {
    id: "kellogg_editing",
    label: "Editorial treatment",
    shortLabel: "KLG",
    sourceBasis: "Remaining textual issues are flagged for consultation; editing must improve readability without altering records.",
    sourceUrl: EDITORIAL_TREATMENT_SOURCE_URL,
    gameplayTask: "Resolve textual issues with human editorial treatment before the proof stamp can satisfy Kellogg standards."
  },
  {
    id: "gpo_segment_assembly",
    label: "GPO segment assembly",
    shortLabel: "SEG",
    sourceBasis: "FRUS volumes could move to GPO in prepared segments; the final segment and apparatus must stay intact before binding.",
    sourceUrl: GPO_SEGMENT_ASSEMBLY_SOURCE_URL,
    gameplayTask: "Submit prepared publication segments, preserve the final index/apparatus, and bind the complete certified volume."
  },
  {
    id: "gpo_publication",
    label: "GPO publication handoff",
    shortLabel: "GPO",
    sourceBasis: "The Department contracts with the Government Printing Office to prepare and publish FRUS volumes.",
    sourceUrl: GPO_PUBLICATION_SOURCE_URL,
    gameplayTask: "Complete the GPO handoff: print, bind, and hold any funding delay without altering the record."
  },
  {
    id: "chapter_release_status",
    label: "Chapter release ledger",
    shortLabel: "CHP",
    sourceBasis: "The Status page tracks Planning, Research, Clearance, and Publication stages, plus volumes published incrementally as chapters clear.",
    sourceUrl: CHAPTER_RELEASE_STATUS_SOURCE_URL,
    gameplayTask: "File visible chapter status: cleared chapters, outstanding chapters, and the public Publication stage."
  },
  {
    id: "digital_release",
    label: "Digital edition release",
    shortLabel: "WEB",
    sourceBasis: "FRUS eBooks use persistent document numbers, and the digital edition needs a TEI-backed public release path.",
    sourceUrl: DIGITAL_RELEASE_SOURCE_URL,
    gameplayTask: "Prepare the history.state.gov digital release manifest after GPO handoff: document numbers, TEI master, and eBook catalog."
  },
  {
    id: "public_citation",
    label: "Public citation card",
    shortLabel: "CIT",
    sourceBasis: "The FRUS citation guide requires stable document numbers, complete citation elements, and canonical history.state.gov URLs.",
    sourceUrl: PUBLIC_CITATION_CARD_SOURCE_URL,
    gameplayTask: "Assemble the reader citation card: media-neutral document number, full publication elements, canonical URL, and legacy-digitization caution."
  },
  {
    id: "release_calendar",
    label: "Release calendar docket",
    shortLabel: "REL",
    sourceBasis: "The Status page lists current and previous-year releases, anticipated current-year releases, stages of production, and published volumes being digitized.",
    sourceUrl: RELEASE_CALENDAR_SOURCE_URL,
    gameplayTask: "File the public release-calendar docket: released volumes, anticipated releases, and digitization status."
  },
  {
    id: "publication_30_year",
    label: "30-year publication",
    shortLabel: "PUB",
    sourceBasis: "The statute mandates FRUS publication 30 years after the events documented.",
    sourceUrl: ABOUT_FRUS_URL,
    gameplayTask: "Open the Buckram Gate with all pendants, crystals, standards, fragments, and the Buckram Key."
  }
] as const satisfies readonly FrusProductionBoardStep[];

const VOLUME_STATE_ORDER: readonly VolumeWorkflowState[] = [
  "charter",
  "research",
  "candidate_selection",
  "source_note_verification",
  "annotation",
  "declassification_review",
  "referral_resolution",
  "editing",
  "proofing",
  "final_assembly",
  "published"
];

const RESOLVED_REVIEW_STATUSES = new Set<ReviewStatus>(["cleared", "excised", "denied", "resolved"]);

function stampSet(context: FrusProductionBoardContext) {
  return new Set(context.processStamps);
}

function volumeAtLeast(context: FrusProductionBoardContext, state: VolumeWorkflowState) {
  return VOLUME_STATE_ORDER.indexOf(context.volumeWorkflowState) >= VOLUME_STATE_ORDER.indexOf(state);
}

function hasDocumentAtOrBeyond(context: FrusProductionBoardContext, states: readonly string[]) {
  return context.documentCandidates.some((document) => states.includes(document.workflowState));
}

function hasSelectedDocument(context: FrusProductionBoardContext) {
  return context.documentCandidates.some((document) => document.selected || document.workflowState === "selected");
}

function hasAnyEquityResponse(context: FrusProductionBoardContext, predicate: (status: ReviewStatus) => boolean) {
  return context.documentCandidates.some((document) => document.equities.some((equity) => predicate(equity.response)));
}

function noUndisclosedDeletions(context: FrusProductionBoardContext) {
  return !context.documentCandidates.some((document) => document.undisclosedDeletion);
}

export function isFrusProductionBoardStepComplete(
  stepId: FrusProductionBoardStepId,
  context: FrusProductionBoardContext
) {
  const stamps = stampSet(context);
  switch (stepId) {
    case "series_concept":
      return context.seriesConceptComplete;
    case "volume_concept":
      return context.volumeConceptComplete;
    case "records_access":
      return context.recordsAccessComplete || stamps.has("rule") || volumeAtLeast(context, "research");
    case "record_collection":
      return context.recordCollectionComplete;
    case "research_selection":
      return (context.selectionDocketComplete && context.documentPoints >= 12 && hasSelectedDocument(context) && researchCoverageComplete(context.documentCandidates))
        || hasDocumentAtOrBeyond(context, ["source_note_needed", "citation_verified", "annotation_needed"])
        || volumeAtLeast(context, "candidate_selection");
    case "source_notes":
      return stamps.has("archive")
        || context.heldProcessItems.has("citation_stamp")
        || hasDocumentAtOrBeyond(context, ["citation_verified", "annotation_needed", "ready_for_review"]);
    case "annotation":
      return context.annotationDraftingComplete
        || hasDocumentAtOrBeyond(context, ["ready_for_review", "submitted_for_review", "referred", "cleared", "ready_for_proof", "proofed", "published"])
        || volumeAtLeast(context, "declassification_review");
    case "manuscript_review":
      return context.manuscriptReviewComplete
        || hasDocumentAtOrBeyond(context, ["ready_for_review", "submitted_for_review", "referred", "cleared", "ready_for_proof", "proofed", "published"])
        || volumeAtLeast(context, "declassification_review");
    case "declassification_review":
      return stamps.has("network")
        || context.heldProcessItems.has("clearance_token")
        || hasAnyEquityResponse(context, (status) => status !== "not_submitted");
    case "foreign_permissions":
      return context.foreignGovernmentPermissionComplete
        || stamps.has("referral")
        || context.heldProcessItems.has("concurrence_slip")
        || volumeAtLeast(context, "editing");
    case "withholding_appeals":
      return context.withholdingAppealComplete
        || stamps.has("referral")
        || context.heldProcessItems.has("concurrence_slip")
        || volumeAtLeast(context, "editing");
    case "agency_referrals":
      return stamps.has("referral")
        || context.heldProcessItems.has("concurrence_slip")
        || (totalEquities(context.documentCandidates) > 0 && crystalsEarned(context.documentCandidates) === totalEquities(context.documentCandidates))
        || hasAnyEquityResponse(context, (status) => RESOLVED_REVIEW_STATUSES.has(status));
    case "advisory_monitoring":
      return context.hacReviewComplete || stamps.has("sop");
    case "editorial_methodology":
      return context.editorialMethodologyComplete;
    case "kellogg_editing":
      return context.editorialMethodologyComplete && context.editorialTreatmentComplete && stamps.has("proof") && context.reliability >= 70 && noUndisclosedDeletions(context);
    case "gpo_segment_assembly":
      return context.finalGatePublished || context.gpoSegmentAssemblyComplete || context.gpoPublicationComplete;
    case "gpo_publication":
      return context.finalGatePublished || context.gpoPublicationComplete;
    case "chapter_release_status":
      return context.finalGatePublished || context.chapterReleaseComplete;
    case "digital_release":
      return context.finalGatePublished || (context.chapterReleaseComplete && context.digitalReleaseComplete);
    case "public_citation":
      return context.finalGatePublished || (context.digitalReleaseComplete && context.publicCitationComplete);
    case "release_calendar":
      return context.finalGatePublished || (context.publicCitationComplete && context.releaseCalendarComplete);
    case "publication_30_year":
      return context.finalGatePublished
        || (context.volumeWorkflowState === "published")
        || (
          buckramGateOpen(context.processStamps, context.documentCandidates)
          && context.heldProcessItems.has("buckram_key")
          && context.volumeFragments.length >= 5
          && context.chapterReleaseComplete
          && context.digitalReleaseComplete
          && context.publicCitationComplete
          && context.releaseCalendarComplete
          && noUndisclosedDeletions(context)
        );
  }
}

export function getFrusProductionBoardReadout(context: FrusProductionBoardContext): FrusProductionBoardReadout {
  const researchCoverage = getResearchCoverageReadout(context.documentCandidates);
  let foundActive = false;
  const steps = FRUS_PRODUCTION_BOARD_STEPS.map((step) => {
    const complete = isFrusProductionBoardStepComplete(step.id, context);
    const status: FrusProductionBoardStatus = complete ? "complete" : foundActive ? "locked" : "active";
    if (!complete && !foundActive) foundActive = true;
    return {
      ...step,
      status,
      complete,
      locked: status === "locked"
    };
  });
  const completed = steps.filter((step) => step.complete).length;
  return {
    completed,
    total: steps.length,
    nextStep: steps.find((step) => step.status === "active") ?? null,
    steps,
    sourceUrls: [...new Set([...steps.map((step) => step.sourceUrl), researchCoverage.sourceUrl])],
    researchCoverage
  };
}
