import type { StandardViolation } from "../systems/standardsDamage";
import type { ChoiceOption } from "./types";

export type WithholdingAppealPromptId =
  | "distinguish_withholding"
  | "appeal_path"
  | "record_outcome";

export interface WithholdingAppealPrompt {
  id: WithholdingAppealPromptId;
  question: string;
  options: readonly ChoiceOption[];
  correctValue: string;
  sourceBasis: string;
  successMessage: string;
  failureMessage: string;
}

export interface WithholdingAppealEvaluation {
  ok: boolean;
  prompt: WithholdingAppealPrompt;
  message: string;
  violation: StandardViolation | null;
}

export const WITHHOLDING_APPEAL_SOURCE_URL = "https://history.state.gov/historicaldocuments/frus-history/stages";

export const WITHHOLDING_APPEAL_PROMPTS = [
  {
    id: "distinguish_withholding",
    question: "WITHHOLDING REVIEW: WHAT KIND OF DECISION IS THIS?",
    options: [
      { key: "A", label: "Whole-document withholding, not a small excision", value: "whole_document" },
      { key: "B", label: "A tiny bracketed deletion", value: "small_excision" },
      { key: "C", label: "A layout problem for the proofreader", value: "layout_problem" }
    ],
    correctValue: "whole_document",
    sourceBasis: "The FRUS stages page distinguishes entire documents withheld in declassification review from documents where only a portion is excised.",
    successMessage: "Whole-document withholding identified: this needs a review path, not an editing shortcut.",
    failureMessage: "Do not treat a withheld document as a minor line edit or proofing issue."
  },
  {
    id: "appeal_path",
    question: "WITHHOLDING REVIEW: WHAT SHOULD THE COMPILER DO NEXT?",
    options: [
      { key: "A", label: "Route the contested withholding through human appeal/review", value: "human_appeal" },
      { key: "B", label: "Let StateChat overrule the denial", value: "machine_override" },
      { key: "C", label: "Hide the document from the volume narrative", value: "hide_document" }
    ],
    correctValue: "human_appeal",
    sourceBasis: "FRUS declassification decisions require accountable review; the game treats contested withholding as a human review hurdle.",
    successMessage: "Appeal routed: the contested document stays visible in the review trail.",
    failureMessage: "A denial cannot be hidden, guessed away, or overruled by StateChat."
  },
  {
    id: "record_outcome",
    question: "WITHHOLDING REVIEW: WHAT MUST THE FINAL PACKET SHOW?",
    options: [
      { key: "A", label: "A visible denial, appeal, or release outcome", value: "visible_outcome" },
      { key: "B", label: "No trace if the document stays closed", value: "no_trace" },
      { key: "C", label: "Rewrite another document to cover the gap", value: "rewrite_gap" }
    ],
    correctValue: "visible_outcome",
    sourceBasis: "The FRUS standards reject undisclosed deletions and omission of material facts; withholding outcomes must remain visible to the publication process.",
    successMessage: "Withholding outcome recorded: the reader-facing packet preserves the decision trail.",
    failureMessage: "A withheld document cannot disappear silently or be replaced with rewritten evidence."
  }
] as const satisfies readonly WithholdingAppealPrompt[];

export function getWithholdingAppealPrompt(step: number) {
  return WITHHOLDING_APPEAL_PROMPTS[Math.max(0, Math.min(WITHHOLDING_APPEAL_PROMPTS.length - 1, step))];
}

export function withholdingAppealComplete(step: number) {
  return step >= WITHHOLDING_APPEAL_PROMPTS.length;
}

export function evaluateWithholdingAppealAnswer(
  promptId: WithholdingAppealPromptId,
  value?: string
): WithholdingAppealEvaluation {
  const prompt = WITHHOLDING_APPEAL_PROMPTS.find((candidate) => candidate.id === promptId)
    ?? WITHHOLDING_APPEAL_PROMPTS[0];
  const ok = value === prompt.correctValue;
  let violation: StandardViolation | null = null;
  if (!ok) {
    if (value === "machine_override" || value === "rewrite_gap") violation = "altered_text";
    else if (value === "hide_document" || value === "no_trace") violation = "omitted_material_fact";
    else violation = "concealed_policy_defect";
  }
  return {
    ok,
    prompt,
    message: ok ? prompt.successMessage : prompt.failureMessage,
    violation
  };
}
