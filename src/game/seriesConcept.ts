import type { StandardViolation } from "../systems/standardsDamage";
import type { ChoiceOption } from "./types";

export type SeriesConceptPromptId =
  | "series_scheme"
  | "volume_fit"
  | "special_topic";

export interface SeriesConceptPrompt {
  id: SeriesConceptPromptId;
  question: string;
  options: readonly ChoiceOption[];
  correctValue: string;
  sourceBasis: string;
  successMessage: string;
  failureMessage: string;
}

export interface SeriesConceptEvaluation {
  ok: boolean;
  prompt: SeriesConceptPrompt;
  message: string;
  violation: StandardViolation | null;
}

export const SERIES_CONCEPT_SOURCE_URL = "https://history.state.gov/historicaldocuments/frus-history/stages";

export const SERIES_CONCEPT_PROMPTS = [
  {
    id: "series_scheme",
    question: "SERIES PLAN: WHAT COMES BEFORE ONE VOLUME?",
    options: [
      { key: "A", label: "Organize the FRUS series as a whole", value: "series_scheme" },
      { key: "B", label: "Let StateChat pick the next folder", value: "statechat_folder" },
      { key: "C", label: "Start with the easiest story arc", value: "easy_story" }
    ],
    correctValue: "series_scheme",
    sourceBasis: "The FRUS stages page begins with grand conceptualization: an organizational scheme for the series as a whole.",
    successMessage: "Series architecture logged: the volume starts inside a whole-series plan.",
    failureMessage: "A FRUS volume cannot start from a machine-picked folder or an easy story."
  },
  {
    id: "volume_fit",
    question: "SERIES PLAN: HOW DOES THIS VOLUME FIT?",
    options: [
      { key: "A", label: "Fit the volume to the holistic series vision", value: "holistic_fit" },
      { key: "B", label: "Ignore neighboring volumes and subseries", value: "standalone_packet" },
      { key: "C", label: "Make a clean one-off packet for speed", value: "speed_packet" }
    ],
    correctValue: "holistic_fit",
    sourceBasis: "Compilers of individual volumes, or portions of volumes, fit their work to the holistic vision for the series.",
    successMessage: "Volume fit logged: this chapter now serves the larger FRUS architecture.",
    failureMessage: "A one-off packet can omit context that belongs in the surrounding series."
  },
  {
    id: "special_topic",
    question: "SERIES PLAN: WHEN DOES A SPECIAL TOPIC WARRANT A VOLUME?",
    options: [
      { key: "A", label: "When the topic has sufficient importance", value: "sufficient_importance" },
      { key: "B", label: "When it avoids difficult policy defects", value: "avoid_defects" },
      { key: "C", label: "When it is short enough to rush through review", value: "rush_short" }
    ],
    correctValue: "sufficient_importance",
    sourceBasis: "The stages page notes special editions for topics of sufficient import to warrant a dedicated volume.",
    successMessage: "Special-topic rule filed: importance, not convenience, defines the exception.",
    failureMessage: "Special editions cannot be chosen to dodge hard evidence or review."
  }
] as const satisfies readonly SeriesConceptPrompt[];

export function getSeriesConceptPrompt(step: number) {
  return SERIES_CONCEPT_PROMPTS[Math.max(0, Math.min(SERIES_CONCEPT_PROMPTS.length - 1, step))];
}

export function seriesConceptComplete(step: number) {
  return step >= SERIES_CONCEPT_PROMPTS.length;
}

export function evaluateSeriesConceptAnswer(
  promptId: SeriesConceptPromptId,
  value?: string
): SeriesConceptEvaluation {
  const prompt = SERIES_CONCEPT_PROMPTS.find((candidate) => candidate.id === promptId) ?? SERIES_CONCEPT_PROMPTS[0];
  const ok = value === prompt.correctValue;
  let violation: StandardViolation | null = null;
  if (!ok) {
    if (value === "avoid_defects" || value === "speed_packet") violation = "concealed_policy_defect";
    else if (value === "easy_story" || value === "standalone_packet" || value === "rush_short") violation = "omitted_material_fact";
    else violation = "altered_text";
  }
  return {
    ok,
    prompt,
    message: ok ? prompt.successMessage : prompt.failureMessage,
    violation
  };
}
