import type { StandardViolation } from "../systems/standardsDamage";
import type { ChoiceOption } from "./types";

export type TypesetterProofPromptId =
  | "typesetting_prep"
  | "document_note_metadata"
  | "compare_to_originals";

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
    id: "typesetting_prep",
    question: "TYPESETTER PROOF: WHAT HAPPENS AFTER CLEARANCE?",
    options: [
      { key: "A", label: "Prepare the cleared text for typesetting", value: "prepare_typesetting" },
      { key: "B", label: "Publish the manuscript as-is", value: "publish_as_is" },
      { key: "C", label: "Let DANN-E rewrite the volume", value: "machine_rewrite" }
    ],
    correctValue: "prepare_typesetting",
    sourceBasis: "The stages page says cleared compilations proceed to editing and preparation for typesetting.",
    successMessage: "Typesetting prep logged: the cleared manuscript becomes publication text.",
    failureMessage: "A cleared manuscript still needs editing and typesetting preparation."
  },
  {
    id: "document_note_metadata",
    question: "TYPESETTER PROOF: WHAT MUST THE NOTES RENDER CORRECTLY?",
    options: [
      { key: "A", label: "Classification, drafting, date, and related document data", value: "document_metadata" },
      { key: "B", label: "Only the page number", value: "page_number_only" },
      { key: "C", label: "A smoother date if the original is awkward", value: "smooth_date" }
    ],
    correctValue: "document_metadata",
    sourceBasis: "FRUS editing checks that information about each document, including classification, drafting, and date, is correctly rendered in notes.",
    successMessage: "Metadata proofed: classification, drafting, and date stay faithful.",
    failureMessage: "Notes must preserve document metadata, not smooth or ignore it."
  },
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
    if (value === "smooth_date" || value === "machine_rewrite") violation = "altered_text";
    else if (value === "silent_resolution") violation = "undisclosed_deletion";
    else violation = "omitted_material_fact";
  }
  return {
    ok,
    prompt,
    message: ok ? prompt.successMessage : prompt.failureMessage,
    violation
  };
}
