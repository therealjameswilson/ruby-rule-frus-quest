import type { StandardViolation } from "../systems/standardsDamage";
import type { ChoiceOption } from "./types";

export type TypesetterCorrectionsPromptId =
  | "compiler_consultation"
  | "visible_resolution"
  | "finished_volume";

export interface TypesetterCorrectionsPrompt {
  id: TypesetterCorrectionsPromptId;
  question: string;
  options: readonly ChoiceOption[];
  correctValue: string;
  sourceBasis: string;
  successMessage: string;
  failureMessage: string;
}

export interface TypesetterCorrectionsEvaluation {
  ok: boolean;
  prompt: TypesetterCorrectionsPrompt;
  message: string;
  violation: StandardViolation | null;
}

export const TYPESETTER_CORRECTIONS_SOURCE_URL = "https://history.state.gov/historicaldocuments/frus-history/stages";

export const TYPESETTER_CORRECTIONS_PROMPTS = [
  {
    id: "compiler_consultation",
    question: "TYPESETTER CORRECTIONS: WHO RESOLVES FLAGGED TEXTUAL ISSUES?",
    options: [
      { key: "A", label: "Compiler consultation with the typesetter", value: "compiler_typesetter" },
      { key: "B", label: "DANN-E smoothing pass", value: "danne_smoothing" },
      { key: "C", label: "Ignore the flags after proofing", value: "ignore_flags" }
    ],
    correctValue: "compiler_typesetter",
    sourceBasis: "The stages page says remaining textual issues are flagged for consultation with the compiler.",
    successMessage: "Consultation logged: flagged textual issues stay human-owned.",
    failureMessage: "Flagged textual issues cannot be ignored or smoothed by DANN-E."
  },
  {
    id: "visible_resolution",
    question: "TYPESETTER CORRECTIONS: HOW SHOULD CORRECTIONS BE FILED?",
    options: [
      { key: "A", label: "Record visible correction decisions before finishing", value: "visible_resolution" },
      { key: "B", label: "Silently normalize awkward original text", value: "silent_normalize" },
      { key: "C", label: "Drop unresolved notes from the apparatus", value: "drop_notes" }
    ],
    correctValue: "visible_resolution",
    sourceBasis: "The stages page places issue resolution after proof comparison and before the volume is finished.",
    successMessage: "Correction docket filed: every adjustment has a visible publication decision.",
    failureMessage: "Correction cannot silently normalize text or drop unresolved notes."
  },
  {
    id: "finished_volume",
    question: "TYPESETTER CORRECTIONS: WHEN IS THE VOLUME FINISHED?",
    options: [
      { key: "A", label: "After remaining editing issues are resolved with the typesetter", value: "resolved_with_typesetter" },
      { key: "B", label: "As soon as the index exists", value: "index_only" },
      { key: "C", label: "When funding or deadline pressure says stop", value: "deadline_stop" }
    ],
    correctValue: "resolved_with_typesetter",
    sourceBasis: "Once remaining editing issues are resolved with the typesetter, the volume is then finished.",
    successMessage: "Typesetter correction docket complete: the finished volume can enter final certification.",
    failureMessage: "The volume is not finished until remaining editing issues are resolved."
  }
] as const satisfies readonly TypesetterCorrectionsPrompt[];

export function getTypesetterCorrectionsPrompt(step: number) {
  return TYPESETTER_CORRECTIONS_PROMPTS[Math.max(0, Math.min(TYPESETTER_CORRECTIONS_PROMPTS.length - 1, step))];
}

export function typesetterCorrectionsComplete(step: number) {
  return step >= TYPESETTER_CORRECTIONS_PROMPTS.length;
}

export function evaluateTypesetterCorrectionsAnswer(
  promptId: TypesetterCorrectionsPromptId,
  value?: string
): TypesetterCorrectionsEvaluation {
  const prompt = TYPESETTER_CORRECTIONS_PROMPTS.find((candidate) => candidate.id === promptId) ?? TYPESETTER_CORRECTIONS_PROMPTS[0];
  const ok = value === prompt.correctValue;
  let violation: StandardViolation | null = null;
  if (!ok) {
    if (value === "silent_normalize" || value === "danne_smoothing") violation = "altered_text";
    else if (value === "drop_notes" || value === "ignore_flags" || value === "index_only") violation = "omitted_material_fact";
    else if (value === "deadline_stop") violation = "missed_30_year_deadline";
    else violation = "concealed_policy_defect";
  }
  return {
    ok,
    prompt,
    message: ok ? prompt.successMessage : prompt.failureMessage,
    violation
  };
}
