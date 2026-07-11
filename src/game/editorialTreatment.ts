import type { StandardViolation } from "../systems/standardsDamage";
import type { ChoiceOption } from "./types";

export type EditorialTreatmentPromptId =
  | "textual_issue_consultation"
  | "style_without_altering"
  | "uncertain_original_reading";

export interface EditorialTreatmentPrompt {
  id: EditorialTreatmentPromptId;
  question: string;
  options: readonly ChoiceOption[];
  correctValue: string;
  sourceBasis: string;
  successMessage: string;
  failureMessage: string;
}

export interface EditorialTreatmentEvaluation {
  ok: boolean;
  prompt: EditorialTreatmentPrompt;
  message: string;
  violation: StandardViolation | null;
}

export const EDITORIAL_TREATMENT_SOURCE_URL = "https://history.state.gov/historicaldocuments/frus-history/stages";

export const EDITORIAL_TREATMENT_PROMPTS = [
  {
    id: "textual_issue_consultation",
    question: "EDITORIAL TREATMENT: WHAT HAPPENS TO A TEXTUAL ISSUE?",
    options: [
      { key: "A", label: "Flag it for compiler-editor consultation", value: "consult_human" },
      { key: "B", label: "Let StateChat pick the final wording", value: "machine_decides" },
      { key: "C", label: "Remove the problem sentence quietly", value: "quiet_remove" }
    ],
    correctValue: "consult_human",
    sourceBasis: "The stages page says remaining textual issues are flagged for consultation with the compiler.",
    successMessage: "Consultation logged: the textual issue stays visible for human judgment.",
    failureMessage: "A textual issue cannot be hidden or decided by a tool."
  },
  {
    id: "style_without_altering",
    question: "EDITORIAL TREATMENT: HOW MAY EDITING IMPROVE READABILITY?",
    options: [
      { key: "A", label: "Clarify presentation without changing the record's meaning", value: "preserve_meaning" },
      { key: "B", label: "Modernize the document until it sounds smoother", value: "modernize_voice" },
      { key: "C", label: "Cut defects so the policy reads cleaner", value: "clean_policy_defect" }
    ],
    correctValue: "preserve_meaning",
    sourceBasis: "FRUS editing prepares cleared compilations for publication while preserving the integrity of the record.",
    successMessage: "Style pass accepted: readability improves without altering documentary meaning.",
    failureMessage: "FRUS editing cannot rewrite documents or conceal policy defects."
  },
  {
    id: "uncertain_original_reading",
    question: "EDITORIAL TREATMENT: WHAT IF THE ORIGINAL TEXT IS UNCERTAIN?",
    options: [
      { key: "A", label: "Preserve the uncertainty with a visible note or bracket", value: "visible_note" },
      { key: "B", label: "Guess the missing reading from context", value: "guess_reading" },
      { key: "C", label: "Publish the smoother reconstruction with no mark", value: "unmarked_reconstruction" }
    ],
    correctValue: "visible_note",
    sourceBasis: "The About the Series standard forbids alteration or undisclosed deletion from documents.",
    successMessage: "Uncertain reading handled: the printed text shows the editorial treatment.",
    failureMessage: "Uncertain text needs a visible editorial mark, not a silent reconstruction."
  }
] as const satisfies readonly EditorialTreatmentPrompt[];

export function getEditorialTreatmentPrompt(step: number) {
  return EDITORIAL_TREATMENT_PROMPTS[Math.max(0, Math.min(EDITORIAL_TREATMENT_PROMPTS.length - 1, step))];
}

export function editorialTreatmentComplete(step: number) {
  return step >= EDITORIAL_TREATMENT_PROMPTS.length;
}

export function evaluateEditorialTreatmentAnswer(
  promptId: EditorialTreatmentPromptId,
  value?: string
): EditorialTreatmentEvaluation {
  const prompt = EDITORIAL_TREATMENT_PROMPTS.find((candidate) => candidate.id === promptId) ?? EDITORIAL_TREATMENT_PROMPTS[0];
  const ok = value === prompt.correctValue;
  let violation: StandardViolation | null = null;
  if (!ok) {
    if (value === "machine_decides" || value === "modernize_voice" || value === "guess_reading" || value === "unmarked_reconstruction") {
      violation = "altered_text";
    } else if (value === "clean_policy_defect") {
      violation = "concealed_policy_defect";
    } else {
      violation = "undisclosed_deletion";
    }
  }

  return {
    ok,
    prompt,
    message: ok ? prompt.successMessage : prompt.failureMessage,
    violation
  };
}
