import type {
  FrusProductionBoardReadout,
  FrusProductionBoardStatus,
  FrusProductionBoardStepId,
  FrusProductionBoardStepReadout
} from "./frusProductionBoard";

export type FrusProductionPhaseId =
  | "concept"
  | "research"
  | "clearance"
  | "editing"
  | "apparatus"
  | "release";

export interface FrusProductionPhase {
  id: FrusProductionPhaseId;
  label: string;
  shortLabel: string;
  sourceBasis: string;
  stepIds: readonly FrusProductionBoardStepId[];
}

export interface FrusProductionPhaseReadout extends FrusProductionPhase {
  completed: number;
  total: number;
  status: FrusProductionBoardStatus;
  nextStep: {
    id: FrusProductionBoardStepId;
    shortLabel: string;
    label: string;
  } | null;
}

export const FRUS_PRODUCTION_PHASES = [
  {
    id: "concept",
    label: "Series and volume plan",
    shortLabel: "PLAN",
    sourceBasis: "Define the series architecture and the individual volume remit before research starts.",
    stepIds: ["series_concept", "volume_concept"]
  },
  {
    id: "research",
    label: "Research, selection, and annotation",
    shortLabel: "RSCH",
    sourceBasis: "Secure access, collect records, select the printed subset, verify sources, and draft contextual annotation.",
    stepIds: ["records_access", "record_collection", "research_selection", "source_notes", "annotation"]
  },
  {
    id: "clearance",
    label: "Review and declassification",
    shortLabel: "CLR",
    sourceBasis: "Review the manuscript and resolve national-security, foreign-government, agency-equity, and HAC oversight issues.",
    stepIds: ["manuscript_review", "declassification_review", "foreign_permissions", "withholding_appeals", "agency_referrals", "advisory_monitoring"]
  },
  {
    id: "editing",
    label: "Editorial treatment and proof",
    shortLabel: "EDIT",
    sourceBasis: "Apply official editorial methodology, human consultation, modern typeflow order, printer's-copy preparation, and proof comparison.",
    stepIds: ["editorial_methodology", "kellogg_editing", "modern_typeflow_order", "typesetting_preparation", "typesetter_proof"]
  },
  {
    id: "apparatus",
    label: "Final apparatus and certification",
    shortLabel: "APP",
    sourceBasis: "Assemble front matter, index, typesetter corrections, and final Kellogg certification before release.",
    stepIds: ["front_matter_assembly", "index_docket", "typesetter_corrections", "kellogg_final_certification"]
  },
  {
    id: "release",
    label: "Print, digital, and public release",
    shortLabel: "REL",
    sourceBasis: "Move the certified volume through GPO, the funding wait queue, chapter status, digital release, public citation, release calendar, and the 30-year publication gate.",
    stepIds: ["gpo_segment_assembly", "gpo_publication", "publication_funding", "chapter_release_status", "digital_release", "public_citation", "release_calendar", "publication_30_year"]
  }
] as const satisfies readonly FrusProductionPhase[];

function statusFromSteps(steps: readonly FrusProductionBoardStepReadout[]): FrusProductionBoardStatus {
  if (steps.every((step) => step.complete)) return "complete";
  if (steps.some((step) => step.status === "active")) return "active";
  return "locked";
}

export function getFrusProductionPhaseReadout(board: FrusProductionBoardReadout): FrusProductionPhaseReadout[] {
  return FRUS_PRODUCTION_PHASES.map((phase) => {
    const phaseSteps = phase.stepIds
      .map((id) => board.steps.find((step) => step.id === id))
      .filter((step): step is FrusProductionBoardStepReadout => Boolean(step));
    return {
      ...phase,
      completed: phaseSteps.filter((step) => step.complete).length,
      total: phase.stepIds.length,
      status: statusFromSteps(phaseSteps),
      nextStep: phaseSteps.find((step) => step.status === "active")
        ? (() => {
            const step = phaseSteps.find((candidate) => candidate.status === "active");
            return step ? { id: step.id, shortLabel: step.shortLabel, label: step.label } : null;
          })()
        : null
    };
  });
}
