import type { StandardViolation } from "../systems/standardsDamage";
import type { ChoiceOption } from "./types";

export type RecordsAccessPromptId =
  | "twenty_year_access"
  | "full_complete_access"
  | "deadline_relationship";

export interface RecordsAccessPrompt {
  id: RecordsAccessPromptId;
  question: string;
  options: readonly ChoiceOption[];
  correctValue: string;
  sourceBasis: string;
  successMessage: string;
  failureMessage: string;
}

export interface RecordsAccessEvaluation {
  ok: boolean;
  prompt: RecordsAccessPrompt;
  message: string;
  violation: StandardViolation | null;
}

export const RECORDS_ACCESS_SOURCE_URL = "https://history.state.gov/historicaldocuments/about-frus";

export const RECORDS_ACCESS_PROMPTS = [
  {
    id: "twenty_year_access",
    question: "20-YEAR ACCESS: WHEN DOES THE ARCHIVE ROUTE OPEN?",
    options: [
      { key: "A", label: "At 20 years for OH historians", value: "twenty_year_access" },
      { key: "B", label: "Only after public release", value: "public_release_only" },
      { key: "C", label: "When DANN-E says the queue is ready", value: "machine_ready" }
    ],
    correctValue: "twenty_year_access",
    sourceBasis: "The About FRUS page says OH historians are granted full and complete access to records at 20 years.",
    successMessage: "Access timing filed: the research route opens at the 20-year access point.",
    failureMessage: "The research route is not limited to public release or machine readiness."
  },
  {
    id: "full_complete_access",
    question: "20-YEAR ACCESS: WHAT IS THE SCOPE?",
    options: [
      { key: "A", label: "Full and complete pertinent records access", value: "full_complete_pertinent" },
      { key: "B", label: "Only public scans and easy folders", value: "public_easy" },
      { key: "C", label: "Only records that support a clean story", value: "clean_story" }
    ],
    correctValue: "full_complete_pertinent",
    sourceBasis: "The access standard covers full and complete access to pertinent records for FRUS compilation.",
    successMessage: "Access scope filed: pertinent records stay available for research and context.",
    failureMessage: "Access cannot be narrowed to easy records or a clean policy story."
  },
  {
    id: "deadline_relationship",
    question: "20-YEAR ACCESS: HOW DOES IT RELATE TO THE 30-YEAR CLOCK?",
    options: [
      { key: "A", label: "Use 20-year access to meet 30-year publication", value: "access_supports_deadline" },
      { key: "B", label: "Wait until 30 years to start research", value: "late_start" },
      { key: "C", label: "Cut hard records to beat the clock", value: "cut_hard_records" }
    ],
    correctValue: "access_supports_deadline",
    sourceBasis: "The 20-year access point supports research before the statutory 30-year publication deadline.",
    successMessage: "Clock relationship filed: access supports timely publication without cutting hard evidence.",
    failureMessage: "The deadline cannot justify a late start or concealed omissions."
  }
] as const satisfies readonly RecordsAccessPrompt[];

export function getRecordsAccessPrompt(step: number) {
  return RECORDS_ACCESS_PROMPTS[Math.max(0, Math.min(RECORDS_ACCESS_PROMPTS.length - 1, step))];
}

export function recordsAccessComplete(step: number) {
  return step >= RECORDS_ACCESS_PROMPTS.length;
}

export function evaluateRecordsAccessAnswer(
  promptId: RecordsAccessPromptId,
  value?: string
): RecordsAccessEvaluation {
  const prompt = RECORDS_ACCESS_PROMPTS.find((candidate) => candidate.id === promptId) ?? RECORDS_ACCESS_PROMPTS[0];
  const ok = value === prompt.correctValue;
  let violation: StandardViolation | null = null;
  if (!ok) {
    if (value === "late_start") violation = "missed_30_year_deadline";
    else if (value === "clean_story" || value === "cut_hard_records") violation = "concealed_policy_defect";
    else if (value === "machine_ready") violation = "altered_text";
    else violation = "omitted_material_fact";
  }
  return {
    ok,
    prompt,
    message: ok ? prompt.successMessage : prompt.failureMessage,
    violation
  };
}
