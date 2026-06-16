import type { StandardViolation } from "../systems/standardsDamage";
import type { ChoiceOption } from "./types";

export type TypesettingPreparationPromptId =
  | "publication_copy"
  | "document_note_metadata";

export interface TypesettingPreparationPrompt {
  id: TypesettingPreparationPromptId;
  question: string;
  options: readonly ChoiceOption[];
  correctValue: string;
  sourceBasis: string;
  successMessage: string;
  failureMessage: string;
}

export interface TypesettingPreparationEvaluation {
  ok: boolean;
  prompt: TypesettingPreparationPrompt;
  message: string;
  violation: StandardViolation | null;
}

export const TYPESETTING_PREPARATION_SOURCE_URL = "https://history.state.gov/historicaldocuments/frus-history/stages";

export const TYPESETTING_PREPARATION_PROMPTS = [
  {
    id: "publication_copy",
    question: "TYPESETTING PREP: WHAT HAPPENS AFTER CLEARANCE?",
    options: [
      { key: "A", label: "Prepare the cleared text for typesetting", value: "prepare_typesetting" },
      { key: "B", label: "Publish the manuscript as-is", value: "publish_as_is" },
      { key: "C", label: "Let DANN-E rewrite the publication copy", value: "machine_rewrite" }
    ],
    correctValue: "prepare_typesetting",
    sourceBasis: "The FRUS stages page says that, after the volume is completed, the text is prepared for typesetting.",
    successMessage: "Printer's copy prepared: the cleared manuscript becomes publication text.",
    failureMessage: "A cleared manuscript still needs accountable preparation for typesetting."
  },
  {
    id: "document_note_metadata",
    question: "TYPESETTING PREP: WHAT MUST THE NOTES RENDER CORRECTLY?",
    options: [
      { key: "A", label: "Classification, drafting, date, and related document data", value: "document_metadata" },
      { key: "B", label: "Only page numbers and short titles", value: "page_number_only" },
      { key: "C", label: "A smoother date if the original is awkward", value: "smooth_date" }
    ],
    correctValue: "document_metadata",
    sourceBasis: "The stages page says the text is carefully reviewed so document information such as classification, drafting, and date is correctly rendered in notes.",
    successMessage: "Printer's copy reviewed: classification, drafting, and date metadata stay faithful.",
    failureMessage: "Typesetting prep cannot ignore, smooth, or minimize document metadata."
  }
] as const satisfies readonly TypesettingPreparationPrompt[];

export function getTypesettingPreparationPrompt(step: number) {
  return TYPESETTING_PREPARATION_PROMPTS[Math.max(0, Math.min(TYPESETTING_PREPARATION_PROMPTS.length - 1, step))];
}

export function typesettingPreparationComplete(step: number) {
  return step >= TYPESETTING_PREPARATION_PROMPTS.length;
}

export function evaluateTypesettingPreparationAnswer(
  promptId: TypesettingPreparationPromptId,
  value?: string
): TypesettingPreparationEvaluation {
  const prompt = TYPESETTING_PREPARATION_PROMPTS.find((candidate) => candidate.id === promptId)
    ?? TYPESETTING_PREPARATION_PROMPTS[0];
  const ok = value === prompt.correctValue;
  let violation: StandardViolation | null = null;
  if (!ok) {
    if (value === "machine_rewrite" || value === "smooth_date") violation = "altered_text";
    else if (value === "publish_as_is" || value === "page_number_only") violation = "omitted_material_fact";
    else violation = "concealed_policy_defect";
  }
  return {
    ok,
    prompt,
    message: ok ? prompt.successMessage : prompt.failureMessage,
    violation
  };
}
