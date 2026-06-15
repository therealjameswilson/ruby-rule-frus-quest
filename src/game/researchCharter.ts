import type { ChoiceOption } from "./types";

export type ResearchCharterPromptId =
  | "scope_first"
  | "records_access"
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

export const RESEARCH_CHARTER_SOURCE_URL = "https://history.state.gov/historicaldocuments/about-frus";

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
    sourceBasis: "OH historians plan the overall scope and content of individual volumes before research and compilation.",
    successMessage: "Correct: define the scope before the archive run.",
    failureMessage: "Scope cannot be guessed by a queue or the first folder on the cart."
  },
  {
    id: "records_access",
    question: "SCOPE CHARTER: WHAT ACCESS BASELINE MATTERS?",
    options: [
      { key: "A", label: "Full pertinent records access at 20 years", value: "twenty_year_access" },
      { key: "B", label: "Only already-published public records", value: "public_only" },
      { key: "C", label: "Wait until the 30-year deadline passes", value: "late_start" }
    ],
    correctValue: "twenty_year_access",
    sourceBasis: "OH historians receive full and complete access to pertinent records at 20 years.",
    successMessage: "Correct: the 20-year access point opens real research.",
    failureMessage: "The access charter is neither public-only nor a late start."
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
