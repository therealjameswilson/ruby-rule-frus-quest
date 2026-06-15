import type { StandardViolation } from "../systems/standardsDamage";
import type { ChoiceOption } from "./types";

export type ManuscriptReviewPromptId =
  | "review_scope"
  | "front_line_recommendations"
  | "series_assessment";

export interface ManuscriptReviewPrompt {
  id: ManuscriptReviewPromptId;
  question: string;
  options: readonly ChoiceOption[];
  correctValue: string;
  sourceBasis: string;
  successMessage: string;
  failureMessage: string;
}

export interface ManuscriptReviewEvaluation {
  ok: boolean;
  prompt: ManuscriptReviewPrompt;
  message: string;
  violation: StandardViolation | null;
}

export const MANUSCRIPT_REVIEW_SOURCE_URL = "https://history.state.gov/historicaldocuments/frus-history/stages";

export const MANUSCRIPT_REVIEW_PROMPTS = [
  {
    id: "review_scope",
    question: "MANUSCRIPT REVIEW: WHAT DOES THE HUMAN REVIEW CHECK?",
    options: [
      { key: "A", label: "Completeness, cohesion, concision, and annotation accuracy", value: "complete_cohesive_accurate" },
      { key: "B", label: "Only whether the volume is short enough", value: "short_only" },
      { key: "C", label: "Whether DANN-E can replace review", value: "machine_review" }
    ],
    correctValue: "complete_cohesive_accurate",
    sourceBasis: "The FRUS stages page describes manuscript review for completeness, cohesion, concision, content appropriateness, and annotation accuracy.",
    successMessage: "Review scope logged: completeness, cohesion, concision, and annotation accuracy.",
    failureMessage: "Manuscript review cannot be reduced to length control or machine replacement."
  },
  {
    id: "front_line_recommendations",
    question: "MANUSCRIPT REVIEW: WHAT DOES THE FIRST REVIEW PASS PRODUCE?",
    options: [
      { key: "A", label: "Recommendations for amendment", value: "recommend_amendment" },
      { key: "B", label: "Silent cuts to speed clearance", value: "silent_cuts" },
      { key: "C", label: "A final publication sign-off", value: "final_signoff" }
    ],
    correctValue: "recommend_amendment",
    sourceBasis: "Recent FRUS volumes typically receive a first review that makes recommendations for amendment.",
    successMessage: "First review pass filed: recommendations stay visible and human-owned.",
    failureMessage: "The first pass recommends amendments; it does not silently cut or publish."
  },
  {
    id: "series_assessment",
    question: "MANUSCRIPT REVIEW: WHAT FOLLOWS THE FIRST PASS?",
    options: [
      { key: "A", label: "Second assessment by the General Editor / series review", value: "series_assessment" },
      { key: "B", label: "Skip to publication before unresolved equities", value: "skip_to_publish" },
      { key: "C", label: "Remove hard policy defects before anyone reads them", value: "hide_defects" }
    ],
    correctValue: "series_assessment",
    sourceBasis: "The stages page describes a second assessment from the General Editor or another Office of the Historian manager.",
    successMessage: "Series assessment complete: the manuscript can move toward clearance with the record intact.",
    failureMessage: "A manuscript cannot skip review or hide defects to move faster."
  }
] as const satisfies readonly ManuscriptReviewPrompt[];

export function getManuscriptReviewPrompt(step: number) {
  return MANUSCRIPT_REVIEW_PROMPTS[Math.max(0, Math.min(MANUSCRIPT_REVIEW_PROMPTS.length - 1, step))];
}

export function manuscriptReviewComplete(step: number) {
  return step >= MANUSCRIPT_REVIEW_PROMPTS.length;
}

export function evaluateManuscriptReviewAnswer(
  promptId: ManuscriptReviewPromptId,
  value?: string
): ManuscriptReviewEvaluation {
  const prompt = MANUSCRIPT_REVIEW_PROMPTS.find((candidate) => candidate.id === promptId) ?? MANUSCRIPT_REVIEW_PROMPTS[0];
  const ok = value === prompt.correctValue;
  let violation: StandardViolation | null = null;
  if (!ok) {
    if (value === "silent_cuts") violation = "undisclosed_deletion";
    else if (value === "hide_defects") violation = "concealed_policy_defect";
    else if (value === "short_only" || value === "skip_to_publish") violation = "omitted_material_fact";
    else violation = "altered_text";
  }
  return {
    ok,
    prompt,
    message: ok ? prompt.successMessage : prompt.failureMessage,
    violation
  };
}
