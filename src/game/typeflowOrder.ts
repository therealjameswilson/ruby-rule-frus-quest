import type { StandardViolation } from "../systems/standardsDamage";
import type { ChoiceOption } from "./types";

export type TypeflowOrderPromptId =
  | "modern_sequence"
  | "legacy_sequence";

export interface TypeflowOrderPrompt {
  id: TypeflowOrderPromptId;
  question: string;
  options: readonly ChoiceOption[];
  correctValue: string;
  sourceBasis: string;
  successMessage: string;
  failureMessage: string;
}

export interface TypeflowOrderEvaluation {
  ok: boolean;
  prompt: TypeflowOrderPrompt;
  message: string;
  violation: StandardViolation | null;
}

export const TYPEFLOW_ORDER_SOURCE_URL = "https://history.state.gov/historicaldocuments/frus-history/stages";

export const TYPEFLOW_ORDER_PROMPTS = [
  {
    id: "modern_sequence",
    question: "TYPEFLOW ORDER: WHAT HAPPENS BEFORE TYPESETTING NOW?",
    options: [
      { key: "A", label: "Clear the compilation in manuscript", value: "clear_manuscript_first" },
      { key: "B", label: "Typeset first and hope clearance catches up", value: "typeset_first_modern" },
      { key: "C", label: "Let DANN-E infer the clean order", value: "machine_order" }
    ],
    correctValue: "clear_manuscript_first",
    sourceBasis: "The stages page says that since the late 1970s, compilations have been cleared in manuscript before proceeding to typesetting.",
    successMessage: "Modern typeflow logged: manuscript clearance precedes typesetting.",
    failureMessage: "Modern FRUS cannot race to typesetting before manuscript clearance."
  },
  {
    id: "legacy_sequence",
    question: "TYPEFLOW ORDER: WHAT WAS DIFFERENT BEFORE THE LATE 1970S?",
    options: [
      { key: "A", label: "Typesetting could precede declassification review", value: "legacy_typeset_first" },
      { key: "B", label: "No declassification review was needed", value: "no_clearance_needed" },
      { key: "C", label: "Dates can be smoothed during typesetting", value: "smooth_dates" }
    ],
    correctValue: "legacy_typeset_first",
    sourceBasis: "The stages page notes that until the late 1970s, the typesetting process preceded declassification review.",
    successMessage: "Legacy note filed: the historical sequence is documented without importing it into the modern lane.",
    failureMessage: "The older sequence must be described accurately; it cannot erase clearance or alter dates."
  }
] as const satisfies readonly TypeflowOrderPrompt[];

export function getTypeflowOrderPrompt(step: number) {
  return TYPEFLOW_ORDER_PROMPTS[Math.max(0, Math.min(TYPEFLOW_ORDER_PROMPTS.length - 1, step))];
}

export function typeflowOrderComplete(step: number) {
  return step >= TYPEFLOW_ORDER_PROMPTS.length;
}

export function evaluateTypeflowOrderAnswer(
  promptId: TypeflowOrderPromptId,
  value?: string
): TypeflowOrderEvaluation {
  const prompt = TYPEFLOW_ORDER_PROMPTS.find((candidate) => candidate.id === promptId) ?? TYPEFLOW_ORDER_PROMPTS[0];
  const ok = value === prompt.correctValue;
  let violation: StandardViolation | null = null;
  if (!ok) {
    if (value === "smooth_dates") violation = "altered_text";
    else if (value === "typeset_first_modern" || value === "no_clearance_needed") violation = "omitted_material_fact";
    else violation = "concealed_policy_defect";
  }

  return {
    ok,
    prompt,
    message: ok ? prompt.successMessage : prompt.failureMessage,
    violation
  };
}
