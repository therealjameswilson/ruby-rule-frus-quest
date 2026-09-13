import type { ChoiceOption } from "./types";
import { ABOUT_SERIES_SOURCE } from "./aboutSeries";

export type ResearchCharterPromptId =
  | "scope_first"
  | "research_route"
  | "kellogg_selection";

export interface ResearchCharterPrompt {
  id: ResearchCharterPromptId;
  question: string;
  options: readonly ChoiceOption[];
  correctValue: string;
  sourceBasis: string;
  successMessage: string;
  failureMessage: string;
}

export interface ResearchCharterEvaluation {
  ok: boolean;
  prompt: ResearchCharterPrompt;
  message: string;
}

export const RESEARCH_CHARTER_SOURCE_URL = ABOUT_SERIES_SOURCE.url;

export const RESEARCH_CHARTER_PROMPTS = [
  {
    id: "scope_first",
    question: "SCOPE CHARTER: WHAT STARTS A FRUS VOLUME?",
    options: [
      { key: "A", label: "Plan scope, content, and research route", value: "scope" },
      { key: "B", label: "Let DANN-E choose the documents", value: "machine" },
      { key: "C", label: "Publish the first folder found", value: "random_folder" }
    ],
    correctValue: "scope",
    sourceBasis: "The Office staff plans, researches, compiles, and edits each volume under the General Editor.",
    successMessage: "Correct: define the scope before the archive run.",
    failureMessage: "Scope cannot be guessed by a queue or the first folder on the cart."
  },
  {
    id: "research_route",
    question: "SCOPE CHARTER: WHAT SHOULD THE ROUTE PRESERVE?",
    options: [
      { key: "A", label: "Scope, source base, and hard questions", value: "scope_sources_questions" },
      { key: "B", label: "Only documents already selected", value: "selected_only" },
      { key: "C", label: "Only records that fit the cleanest story", value: "clean_story" }
    ],
    correctValue: "scope_sources_questions",
    sourceBasis: "The statute requires all records needed for comprehensive documentation of major decisions and actions.",
    successMessage: "Correct: the charter preserves the route from scope to evidence.",
    failureMessage: "The charter cannot start from a narrowed or cleaned-up record."
  },
  {
    id: "kellogg_selection",
    question: "SCOPE CHARTER: WHICH STANDARD GUIDES SELECTION?",
    options: [
      { key: "A", label: "Favor the cleanest policy story", value: "clean_story" },
      { key: "B", label: "No major fact omissions or concealed defects", value: "complete_record" },
      { key: "C", label: "Remove hard passages before review", value: "precut" }
    ],
    correctValue: "complete_record",
    sourceBasis: "FRUS standards require no omission of major facts and no concealment of policy defects.",
    successMessage: "Correct: the candidate set must preserve the record's hard parts.",
    failureMessage: "Selection cannot smooth away material facts or policy defects."
  }
] as const satisfies readonly ResearchCharterPrompt[];

export function getResearchCharterPrompt(step: number) {
  return RESEARCH_CHARTER_PROMPTS[Math.max(0, Math.min(RESEARCH_CHARTER_PROMPTS.length - 1, step))];
}

export function researchCharterComplete(step: number) {
  return step >= RESEARCH_CHARTER_PROMPTS.length;
}

export function evaluateResearchCharterAnswer(
  promptId: ResearchCharterPromptId,
  value?: string
): ResearchCharterEvaluation {
  const prompt = RESEARCH_CHARTER_PROMPTS.find((candidate) => candidate.id === promptId) ?? RESEARCH_CHARTER_PROMPTS[0];
  const ok = value === prompt.correctValue;
  return {
    ok,
    prompt,
    message: ok ? prompt.successMessage : prompt.failureMessage
  };
}
