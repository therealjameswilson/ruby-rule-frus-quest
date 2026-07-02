import type { StandardViolation } from "../systems/standardsDamage";
import type { ChoiceOption } from "./types";

export type Eo13526ReviewPromptId =
  | "release_standard"
  | "concurrence_chain"
  | "accounting_record";

export interface Eo13526ReviewPrompt {
  id: Eo13526ReviewPromptId;
  question: string;
  options: readonly ChoiceOption[];
  correctValue: string;
  sourceBasis: string;
  successMessage: string;
  failureMessage: string;
}

export interface Eo13526ReviewEvaluation {
  ok: boolean;
  prompt: Eo13526ReviewPrompt;
  message: string;
  violation: StandardViolation | null;
}

export const EO13526_REVIEW_SOURCE_URL = "https://history.state.gov/historicaldocuments/frus1969-76v22/preface";

export const EO13526_REVIEW_PROMPTS = [
  {
    id: "release_standard",
    question: "E.O. 13526 REVIEW: WHAT IS THE RELEASE STANDARD?",
    options: [
      { key: "A", label: "Release all information subject only to current national security requirements", value: "release_with_current_security_limits" },
      { key: "B", label: "Withhold hard passages that make the volume slower", value: "withhold_for_speed" },
      { key: "C", label: "Let DANN-E publish confidence-scored summaries instead", value: "machine_summary" }
    ],
    correctValue: "release_with_current_security_limits",
    sourceBasis: "The preface says the reviewers' principle was to release all information subject only to current national security requirements under E.O. 13526.",
    successMessage: "E.O. 13526 release standard logged: release what can be released.",
    failureMessage: "E.O. 13526 review cannot withhold material for convenience or replace records with summaries."
  },
  {
    id: "concurrence_chain",
    question: "E.O. 13526 REVIEW: WHO MUST CONCUR WHEN EQUITIES APPEAR?",
    options: [
      { key: "A", label: "Appropriate bureaus, agencies, and foreign governments", value: "appropriate_concurrence" },
      { key: "B", label: "Only the terminal if it flags no syntax issue", value: "terminal_only" },
      { key: "C", label: "Only the compiler, to protect the deadline", value: "compiler_only" }
    ],
    correctValue: "appropriate_concurrence",
    sourceBasis: "The preface describes full declassification review with appropriate geographic and functional bureaus, other agencies, and foreign governments.",
    successMessage: "Concurrence chain logged: every equity keeps a human route.",
    failureMessage: "Equity concurrence cannot collapse into a terminal check or a compiler shortcut."
  },
  {
    id: "accounting_record",
    question: "E.O. 13526 REVIEW: HOW ARE WITHHELD PASSAGES HANDLED?",
    options: [
      { key: "A", label: "Record the decision and preserve visible excision accounting", value: "visible_accounting" },
      { key: "B", label: "Delete the passage without a mark", value: "silent_delete" },
      { key: "C", label: "Smooth the sentence so the gap disappears", value: "smooth_gap" }
    ],
    correctValue: "visible_accounting",
    sourceBasis: "The preface accounts for documents withheld, documents excised, and partial excisions after review.",
    successMessage: "Withholding accounting logged: review limits remain visible.",
    failureMessage: "Review limits must be accounted for; they cannot disappear into silent edits."
  }
] as const satisfies readonly Eo13526ReviewPrompt[];

export function getEo13526ReviewPrompt(step: number) {
  return EO13526_REVIEW_PROMPTS[Math.max(0, Math.min(EO13526_REVIEW_PROMPTS.length - 1, step))];
}

export function eo13526ReviewComplete(step: number) {
  return step >= EO13526_REVIEW_PROMPTS.length;
}

export function evaluateEo13526ReviewAnswer(
  promptId: Eo13526ReviewPromptId,
  value?: string
): Eo13526ReviewEvaluation {
  const prompt = EO13526_REVIEW_PROMPTS.find((candidate) => candidate.id === promptId) ?? EO13526_REVIEW_PROMPTS[0];
  const ok = value === prompt.correctValue;
  let violation: StandardViolation | null = null;
  if (!ok) {
    if (value === "silent_delete") violation = "undisclosed_deletion";
    else if (value === "smooth_gap" || value === "machine_summary") violation = "altered_text";
    else if (value === "withhold_for_speed") violation = "omitted_material_fact";
    else violation = "concealed_policy_defect";
  }

  return {
    ok,
    prompt,
    message: ok ? prompt.successMessage : prompt.failureMessage,
    violation
  };
}
