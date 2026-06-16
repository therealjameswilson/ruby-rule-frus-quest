import type { StandardViolation } from "../systems/standardsDamage";
import type { ChoiceOption } from "./types";
import { RESEARCH_COVERAGE_LANES, RESEARCH_COVERAGE_SOURCE_URL } from "./researchCoverage";

export type RepositoryCoverageMapPromptId =
  | "source_lanes"
  | "private_papers"
  | "missing_lane_response";

export interface RepositoryCoverageMapPrompt {
  id: RepositoryCoverageMapPromptId;
  question: string;
  options: readonly ChoiceOption[];
  correctValue: string;
  sourceBasis: string;
  successMessage: string;
  failureMessage: string;
}

export interface RepositoryCoverageMapEvaluation {
  ok: boolean;
  prompt: RepositoryCoverageMapPrompt;
  message: string;
  violation: StandardViolation | null;
}

export const REPOSITORY_COVERAGE_MAP_SOURCE_URL = RESEARCH_COVERAGE_SOURCE_URL;

export const REPOSITORY_COVERAGE_MAP_PROMPTS = [
  {
    id: "source_lanes",
    question: "SOURCE MAP: WHICH RECORD BASE MUST BE VISIBLE?",
    options: [
      { key: "A", label: "White House, NSC, State, Defense, CIA, agencies, papers", value: "full_source_lanes" },
      { key: "B", label: "Only files already in the State lot", value: "state_only" },
      { key: "C", label: "Only folders DANN-E can summarize", value: "machine_summary_lanes" }
    ],
    correctValue: "full_source_lanes",
    sourceBasis: "The FRUS research base spans White House/NSC, State, Defense, CIA, other agencies, and private papers.",
    successMessage: "Repository map opened: the full national-security source base is visible.",
    failureMessage: "The source map cannot collapse the research base to one lot or one machine-friendly lane."
  },
  {
    id: "private_papers",
    question: "SOURCE MAP: WHICH NON-AGENCY LANE STAYS ON THE MAP?",
    options: [
      { key: "A", label: "Private papers of policymakers", value: "private_papers" },
      { key: "B", label: "Only published memoir quotations", value: "memoirs_only" },
      { key: "C", label: "No personal papers after selection", value: "drop_papers" }
    ],
    correctValue: "private_papers",
    sourceBasis: "The source base includes private papers of individual U.S. foreign policymakers.",
    successMessage: "Private-papers lane filed: personal-policy context remains part of the map.",
    failureMessage: "Private papers are a repository lane, not optional decoration after selection."
  },
  {
    id: "missing_lane_response",
    question: "SOURCE MAP: WHAT IF A REPOSITORY LANE IS MISSING?",
    options: [
      { key: "A", label: "Return to collection or annotate the visible gap", value: "return_or_annotate" },
      { key: "B", label: "Claim the selected set proves full coverage", value: "claim_complete" },
      { key: "C", label: "Hide the gap in a style edit", value: "hide_gap" }
    ],
    correctValue: "return_or_annotate",
    sourceBasis: "A reliable FRUS volume needs a visible source route before selection narrows the printed subset.",
    successMessage: "Coverage gap rule filed: missing lanes trigger more collection or visible annotation.",
    failureMessage: "A source gap cannot be hidden or converted into a false claim of completeness."
  }
] as const satisfies readonly RepositoryCoverageMapPrompt[];

export function repositoryCoverageLaneCount() {
  return RESEARCH_COVERAGE_LANES.length;
}

export function getRepositoryCoverageMapPrompt(step: number) {
  return REPOSITORY_COVERAGE_MAP_PROMPTS[Math.max(0, Math.min(REPOSITORY_COVERAGE_MAP_PROMPTS.length - 1, step))];
}

export function repositoryCoverageMapComplete(step: number) {
  return step >= REPOSITORY_COVERAGE_MAP_PROMPTS.length;
}

export function evaluateRepositoryCoverageMapAnswer(
  promptId: RepositoryCoverageMapPromptId,
  value?: string
): RepositoryCoverageMapEvaluation {
  const prompt = REPOSITORY_COVERAGE_MAP_PROMPTS.find((candidate) => candidate.id === promptId) ?? REPOSITORY_COVERAGE_MAP_PROMPTS[0];
  const ok = value === prompt.correctValue;
  let violation: StandardViolation | null = null;
  if (!ok) {
    if (value === "machine_summary_lanes") violation = "altered_text";
    else if (value === "claim_complete" || value === "hide_gap") violation = "concealed_policy_defect";
    else violation = "omitted_material_fact";
  }
  return {
    ok,
    prompt,
    message: ok ? prompt.successMessage : prompt.failureMessage,
    violation
  };
}
