import type { StandardViolation } from "../systems/standardsDamage";
import type { ChoiceOption } from "./types";

export type ReleaseCalendarPromptId =
  | "current_previous_releases"
  | "anticipated_releases"
  | "digitization_queue";

export interface ReleaseCalendarPrompt {
  id: ReleaseCalendarPromptId;
  question: string;
  options: readonly ChoiceOption[];
  correctValue: string;
  sourceBasis: string;
  successMessage: string;
  failureMessage: string;
}

export interface ReleaseCalendarEvaluation {
  ok: boolean;
  prompt: ReleaseCalendarPrompt;
  message: string;
  violation: StandardViolation | null;
}

export const RELEASE_CALENDAR_SOURCE_URL = "https://history.state.gov/historicaldocuments/status-of-the-series";
export const QUARTERLY_RELEASES_SOURCE_URL = "https://history.state.gov/historicaldocuments/quarterly-releases";

export const RELEASE_CALENDAR_PROMPTS = [
  {
    id: "current_previous_releases",
    question: "RELEASE CALENDAR: WHAT MUST THE PUBLIC STATUS DOCKET LIST?",
    options: [
      { key: "A", label: "Current and previous-year releases", value: "current_previous" },
      { key: "B", label: "Only volumes that have no delays", value: "no_delays_only" },
      { key: "C", label: "Private terminal releases only", value: "private_terminal" }
    ],
    correctValue: "current_previous",
    sourceBasis: "The Status page says it lists publications released in the current and previous calendar year.",
    successMessage: "Release calendar filed: current and previous-year public releases are visible.",
    failureMessage: "The public release docket cannot hide delayed volumes or replace public status with a private terminal list."
  },
  {
    id: "anticipated_releases",
    question: "RELEASE CALENDAR: WHERE DO PLANNED CURRENT-YEAR VOLUMES BELONG?",
    options: [
      { key: "A", label: "Anticipated release lane", value: "anticipated_lane" },
      { key: "B", label: "Mark them already published", value: "false_published" },
      { key: "C", label: "Delete the plan to avoid questions", value: "delete_plan" }
    ],
    correctValue: "anticipated_lane",
    sourceBasis: "The Status page distinguishes releases planned for later in the current year from already released publications.",
    successMessage: "Anticipated releases filed: planned volumes are visible without false publication status.",
    failureMessage: "A planned release must not be mislabeled as published or erased from the public calendar."
  },
  {
    id: "digitization_queue",
    question: "RELEASE CALENDAR: HOW ARE PUBLISHED VOLUMES BEING DIGITIZED TRACKED?",
    options: [
      { key: "A", label: "List the digitization queue separately", value: "separate_digitization" },
      { key: "B", label: "Fold digitization into new-publication counts", value: "fold_into_new" },
      { key: "C", label: "Suppress digitization status", value: "suppress_digitization" }
    ],
    correctValue: "separate_digitization",
    sourceBasis: "The Status page says published volumes being digitized are also listed.",
    successMessage: "Digitization queue filed: legacy public volumes stay distinct from new publication.",
    failureMessage: "Digitization status must remain visible and cannot be counted as a new FRUS publication."
  }
] as const satisfies readonly ReleaseCalendarPrompt[];

export function getReleaseCalendarPrompt(step: number) {
  return RELEASE_CALENDAR_PROMPTS[Math.max(0, Math.min(RELEASE_CALENDAR_PROMPTS.length - 1, step))];
}

export function releaseCalendarComplete(step: number) {
  return step >= RELEASE_CALENDAR_PROMPTS.length;
}

export function evaluateReleaseCalendarAnswer(
  promptId: ReleaseCalendarPromptId,
  value?: string
): ReleaseCalendarEvaluation {
  const prompt = RELEASE_CALENDAR_PROMPTS.find((candidate) => candidate.id === promptId) ?? RELEASE_CALENDAR_PROMPTS[0];
  const ok = value === prompt.correctValue;
  let violation: StandardViolation | null = null;
  if (!ok) {
    if (value === "delete_plan" || value === "suppress_digitization" || value === "no_delays_only") violation = "omitted_material_fact";
    else if (value === "false_published" || value === "fold_into_new") violation = "concealed_policy_defect";
    else violation = "altered_text";
  }
  return {
    ok,
    prompt,
    message: ok ? prompt.successMessage : prompt.failureMessage,
    violation
  };
}
