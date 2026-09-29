import type { DocumentCandidate } from "./types";

export type ResearchCoverageLane =
  | "white_house_nsc"
  | "state_department"
  | "defense"
  | "central_intelligence"
  | "other_foreign_affairs"
  | "private_papers";

export interface ResearchCoverageLaneDefinition {
  id: ResearchCoverageLane;
  label: string;
  shortLabel: string;
  sourceBasis: string;
}

export interface ResearchCoverageReadout {
  sourceUrl: string;
  sourceBasis: string;
  complete: boolean;
  completed: number;
  total: number;
  covered: ResearchCoverageLaneDefinition[];
  missing: ResearchCoverageLaneDefinition[];
  selectedDocumentIds: string[];
  summary: string;
}

export const RESEARCH_COVERAGE_SOURCE_URL = "https://history.state.gov/historicaldocuments/about-frus";

export const RESEARCH_COVERAGE_LANES = [
  {
    id: "white_house_nsc",
    label: "White House / NSC records",
    shortLabel: "WH/NSC",
    sourceBasis: "FRUS research includes White House and National Security Council records."
  },
  {
    id: "state_department",
    label: "Department of State records",
    shortLabel: "STATE",
    sourceBasis: "FRUS research includes Department of State records."
  },
  {
    id: "defense",
    label: "Department of Defense records",
    shortLabel: "DEF",
    sourceBasis: "FRUS research includes Department of Defense records."
  },
  {
    id: "central_intelligence",
    label: "Central Intelligence Agency records",
    shortLabel: "CIA",
    sourceBasis: "FRUS research includes Central Intelligence Agency records."
  },
  {
    id: "other_foreign_affairs",
    label: "Other foreign-affairs agency records",
    shortLabel: "AGY",
    sourceBasis: "FRUS research includes other foreign-affairs agency records."
  },
  {
    id: "private_papers",
    label: "Private papers of policymakers",
    shortLabel: "PPRS",
    sourceBasis: "FRUS research includes private papers of individual U.S. foreign policymakers."
  }
] as const satisfies readonly ResearchCoverageLaneDefinition[];

// Authored source-family bundles for the fictional campaign exercise.
export const DOCUMENT_RESEARCH_LANES: Partial<Record<string, readonly ResearchCoverageLane[]>> = {
  "doc-001": ["state_department", "defense"],
  telegram_001: ["state_department"],
  source_note_047: ["white_house_nsc", "private_papers"],
  cross_reference_001: ["other_foreign_affairs"],
  sbu_annotation_001: ["defense", "central_intelligence", "other_foreign_affairs"],
  proof_page_412: ["state_department"]
};

const LANE_LOOKUP = new Map<ResearchCoverageLane, ResearchCoverageLaneDefinition>(
  RESEARCH_COVERAGE_LANES.map((lane) => [lane.id, lane])
);

export function researchLanesForDocument(document: Pick<DocumentCandidate, "id" | "repository" | "collection" | "folder" | "equities">) {
  const explicit = DOCUMENT_RESEARCH_LANES[document.id];
  if (explicit) return [...explicit];

  // A topic or reviewing agency is not provenance. Only repository/collection
  // descriptions can identify a source family for an unconfigured document.
  const provenance = `${document.repository} ${document.collection}`.toLowerCase();
  const lanes = new Set<ResearchCoverageLane>();
  if (/\b(white house|nsc|national security council)\b/.test(provenance)) lanes.add("white_house_nsc");
  if (/\b(department of state|state department|central foreign policy|rg[ -]?59)\b/.test(provenance)) lanes.add("state_department");
  if (/\b(department of defense|defense department|dod|joint chiefs of staff)\b/.test(provenance)) lanes.add("defense");
  if (/\b(cia|central intelligence agency)\b/.test(provenance)) lanes.add("central_intelligence");
  if (/\b(usia|usaid|acda|united states information agency|arms control and disarmament agency|department of (commerce|treasury)|agency for international development)\b/.test(provenance)) lanes.add("other_foreign_affairs");
  if (/\b(private papers|personal papers|oral history|diary|diaries)\b/.test(provenance)) lanes.add("private_papers");
  return [...lanes];
}

function laneDefinition(id: ResearchCoverageLane) {
  const lane = LANE_LOOKUP.get(id);
  if (!lane) throw new Error(`Unknown research coverage lane: ${id}`);
  return lane;
}

export function getResearchCoverageReadout(documents: readonly DocumentCandidate[]): ResearchCoverageReadout {
  const selectedDocuments = documents.filter((document) => document.selected || document.workflowState === "selected");
  const coveredIds = new Set<ResearchCoverageLane>();
  for (const document of selectedDocuments) {
    for (const lane of researchLanesForDocument(document)) coveredIds.add(lane);
  }
  const covered = RESEARCH_COVERAGE_LANES.filter((lane) => coveredIds.has(lane.id));
  const missing = RESEARCH_COVERAGE_LANES.filter((lane) => !coveredIds.has(lane.id));
  const complete = missing.length === 0;
  const missingLabels = missing.map((lane) => lane.shortLabel).join(", ");
  return {
    sourceUrl: RESEARCH_COVERAGE_SOURCE_URL,
    sourceBasis: "FRUS research uses records across the White House, NSC, State, Defense, CIA, other agencies, and private papers.",
    complete,
    completed: covered.length,
    total: RESEARCH_COVERAGE_LANES.length,
    covered: covered.map((lane) => laneDefinition(lane.id)),
    missing: missing.map((lane) => laneDefinition(lane.id)),
    selectedDocumentIds: selectedDocuments.map((document) => document.id),
    summary: complete
      ? "Exercise source families represented. Check remaining leads and access gaps."
      : `Exercise source families still unrepresented: ${missingLabels || "none"}.`
  };
}

export function researchCoverageComplete(documents: readonly DocumentCandidate[]) {
  return getResearchCoverageReadout(documents).complete;
}
