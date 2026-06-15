import type { ProcessItemId, ProcessStampId } from "./constants";
import type { DocumentCandidate, ReviewStatus, VolumeWorkflowState } from "./types";
import { buckramGateOpen, crystalsEarned, totalEquities } from "./frusProgression";
import { getResearchCoverageReadout, researchCoverageComplete, type ResearchCoverageReadout } from "./researchCoverage";
import { SERIES_CONCEPT_SOURCE_URL } from "./seriesConcept";

export type FrusProductionBoardStepId =
  | "series_concept"
  | "records_access"
  | "research_selection"
  | "source_notes"
  | "manuscript_review"
  | "declassification_review"
  | "agency_referrals"
  | "advisory_monitoring"
  | "kellogg_editing"
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
  manuscriptReviewComplete: boolean;
  seriesConceptComplete: boolean;
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
    id: "records_access",
    label: "20-year records access",
    shortLabel: "20Y",
    sourceBasis: "OH historians get full and complete access to pertinent records at 20 years.",
    sourceUrl: ABOUT_FRUS_URL,
    gameplayTask: "Accept the Golden Rule charter and begin the Office Hub route."
  },
  {
    id: "research_selection",
    label: "Research and selection",
    shortLabel: "SEL",
    sourceBasis: "OH historians research across White House, NSC, State, Defense, CIA, other agency, and private-paper records.",
    sourceUrl: ABOUT_FRUS_URL,
    gameplayTask: "Select a balanced candidate set that covers the full FRUS research base."
  },
  {
    id: "source_notes",
    label: "Source notes and annotation",
    shortLabel: "SRC",
    sourceBasis: "FRUS must be thorough, accurate, and reliable across the national security record.",
    sourceUrl: ABOUT_FRUS_URL,
    gameplayTask: "Verify Source Note 47 at the research table with the Citation Stamp."
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
    sourceBasis: "FRUS draws on records across State, Defense, CIA, NSC, and other agencies.",
    sourceUrl: ABOUT_FRUS_URL,
    gameplayTask: "Route OpenNet/ClassNet issues and earn the Clearance Token."
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
    id: "kellogg_editing",
    label: "Kellogg editing standards",
    shortLabel: "KLG",
    sourceBasis: "No altered records, undisclosed deletions, major-fact omissions, or concealment of policy defects.",
    sourceUrl: ABOUT_FRUS_URL,
    gameplayTask: "Use Red Pencil and Proof Lens; bracket every excision and keep reliability above 70."
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
    case "records_access":
      return stamps.has("rule") || volumeAtLeast(context, "research");
    case "research_selection":
      return (context.documentPoints >= 12 && hasSelectedDocument(context) && researchCoverageComplete(context.documentCandidates))
        || hasDocumentAtOrBeyond(context, ["source_note_needed", "citation_verified"])
        || volumeAtLeast(context, "candidate_selection");
    case "source_notes":
      return stamps.has("archive")
        || context.heldProcessItems.has("citation_stamp")
        || hasDocumentAtOrBeyond(context, ["citation_verified", "annotation_needed", "ready_for_review"]);
    case "manuscript_review":
      return context.manuscriptReviewComplete
        || hasDocumentAtOrBeyond(context, ["ready_for_review", "submitted_for_review", "referred", "cleared", "ready_for_proof", "proofed", "published"])
        || volumeAtLeast(context, "declassification_review");
    case "declassification_review":
      return stamps.has("network")
        || context.heldProcessItems.has("clearance_token")
        || hasAnyEquityResponse(context, (status) => status !== "not_submitted");
    case "agency_referrals":
      return stamps.has("referral")
        || context.heldProcessItems.has("concurrence_slip")
        || (totalEquities(context.documentCandidates) > 0 && crystalsEarned(context.documentCandidates) === totalEquities(context.documentCandidates))
        || hasAnyEquityResponse(context, (status) => RESOLVED_REVIEW_STATUSES.has(status));
    case "advisory_monitoring":
      return context.hacReviewComplete || stamps.has("sop");
    case "kellogg_editing":
      return stamps.has("proof") && context.reliability >= 70 && noUndisclosedDeletions(context);
    case "publication_30_year":
      return context.finalGatePublished
        || (context.volumeWorkflowState === "published")
        || (
          buckramGateOpen(context.processStamps, context.documentCandidates)
          && context.heldProcessItems.has("buckram_key")
          && context.volumeFragments.length >= 5
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
