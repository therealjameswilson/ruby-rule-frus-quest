import type { StandardViolation } from "../systems/standardsDamage";
import type { ChoiceOption } from "./types";

export type TypesetterProofPromptId =
  | "compare_to_originals"
  | "flag_textual_issues";

export interface TypesetterProofPrompt {
  id: TypesetterProofPromptId;
  question: string;
  options: readonly ChoiceOption[];
  correctValue: string;
  sourceBasis: string;
  successMessage: string;
  failureMessage: string;
}

export interface TypesetterProofEvaluation {
  ok: boolean;
  prompt: TypesetterProofPrompt;
  message: string;
  violation: StandardViolation | null;
}

export const TYPESETTER_PROOF_SOURCE_URL = "https://history.state.gov/historicaldocuments/frus-history/stages";

export const TYPESETTER_PROOF_PROMPTS = [
  {
    id: "compare_to_originals",
    question: "TYPESETTER PROOF: HOW ARE TYPESET PAGES VERIFIED?",
    options: [
      { key: "A", label: "Compare pages to originals and flag textual issues", value: "compare_originals" },
      { key: "B", label: "Trust the typesetter without checking", value: "trust_typesetter" },
      { key: "C", label: "Resolve remaining issues silently", value: "silent_resolution" }
    ],
    correctValue: "compare_originals",
    sourceBasis: "After typesetting, pages are compared to original documents, and remaining textual issues are flagged for consultation with the compiler.",
    successMessage: "Typeset proof complete: pages match originals and unresolved text is flagged.",
    failureMessage: "Typeset pages must be checked against originals with visible consultation."
  },
  {
    id: "flag_textual_issues",
    question: "TYPESETTER PROOF: WHAT HAPPENS TO REMAINING TEXTUAL ISSUES?",
    options: [
      { key: "A", label: "Flag them for compiler consultation", value: "flag_consultation" },
      { key: "B", label: "Resolve them silently during proofing", value: "silent_resolution" },
      { key: "C", label: "Stop checking because the deadline is close", value: "deadline_stop" }
    ],
    correctValue: "flag_consultation",
    sourceBasis: "After typesetting, remaining textual issues are flagged for consultation with the compiler.",
    successMessage: "Textual issues flagged: the correction docket will resolve them visibly.",
    failureMessage: "Proofing flags unresolved text; it cannot silently decide or stop early."
  }
] as const satisfies readonly TypesetterProofPrompt[];

export function getTypesetterProofPrompt(step: number) {
  return TYPESETTER_PROOF_PROMPTS[Math.max(0, Math.min(TYPESETTER_PROOF_PROMPTS.length - 1, step))];
}

export function typesetterProofComplete(step: number) {
  return step >= TYPESETTER_PROOF_PROMPTS.length;
}

export function evaluateTypesetterProofAnswer(
  promptId: TypesetterProofPromptId,
  value?: string
): TypesetterProofEvaluation {
  const prompt = TYPESETTER_PROOF_PROMPTS.find((candidate) => candidate.id === promptId) ?? TYPESETTER_PROOF_PROMPTS[0];
  const ok = value === prompt.correctValue;
  let violation: StandardViolation | null = null;
  if (!ok) {
    if (value === "silent_resolution") violation = "undisclosed_deletion";
    else if (value === "deadline_stop" || value === "trust_typesetter") violation = "omitted_material_fact";
    else violation = "omitted_material_fact";
  }
  return {
    ok,
    prompt,
    message: ok ? prompt.successMessage : prompt.failureMessage,
    violation
  };
}
