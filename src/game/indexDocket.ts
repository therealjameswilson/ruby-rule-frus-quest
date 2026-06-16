import type { StandardViolation } from "../systems/standardsDamage";
import type { ChoiceOption } from "./types";

export type IndexDocketPromptId =
  | "verified_entries"
  | "cross_references"
  | "no_machine_headings";

export interface IndexDocketPrompt {
  id: IndexDocketPromptId;
  question: string;
  options: readonly ChoiceOption[];
  correctValue: string;
  sourceBasis: string;
  successMessage: string;
  failureMessage: string;
}

export interface IndexDocketEvaluation {
  ok: boolean;
  prompt: IndexDocketPrompt;
  message: string;
  violation: StandardViolation | null;
}

export const INDEX_DOCKET_SOURCE_URL = "https://history.state.gov/historicaldocuments/frus-history/stages";

export const INDEX_DOCKET_PROMPTS = [
  {
    id: "verified_entries",
    question: "INDEX DOCKET: WHAT MUST EACH ENTRY MATCH?",
    options: [
      { key: "A", label: "Verified persons, offices, subjects, and page context", value: "verified_entries" },
      { key: "B", label: "Only famous names from the cover", value: "famous_only" },
      { key: "C", label: "DANN-E confidence tags", value: "machine_tags" }
    ],
    correctValue: "verified_entries",
    sourceBasis: "The stages page says an index is added after typeset pages are compared to original documents.",
    successMessage: "Index entries verified: names, offices, subjects, and page context match the proofed text.",
    failureMessage: "The index cannot be narrowed to famous names or machine confidence tags."
  },
  {
    id: "cross_references",
    question: "INDEX DOCKET: HOW SHOULD RELATED TERMS BE CONNECTED?",
    options: [
      { key: "A", label: "Use checked cross-references and consistent headings", value: "checked_cross_refs" },
      { key: "B", label: "Leave duplicate headings for the reader to reconcile", value: "duplicate_headings" },
      { key: "C", label: "Drop hard references to save space", value: "drop_hard_refs" }
    ],
    correctValue: "checked_cross_refs",
    sourceBasis: "A publication index is a reader aid; it must connect the proofed text without losing relevant references.",
    successMessage: "Cross-references checked: related entries point readers through the proofed record.",
    failureMessage: "Duplicate headings or dropped references make the public record harder to reconstruct."
  },
  {
    id: "no_machine_headings",
    question: "INDEX DOCKET: WHO OWNS THE FINAL HEADING SET?",
    options: [
      { key: "A", label: "Human publication review after proof comparison", value: "human_review" },
      { key: "B", label: "StateChat final headings", value: "statechat_headings" },
      { key: "C", label: "DANN-E topic smoothing", value: "danne_smoothing" }
    ],
    correctValue: "human_review",
    sourceBasis: "After proof comparison, the final apparatus remains a human-edited publication aid, not a terminal shortcut.",
    successMessage: "Index docket filed: human-reviewed headings join the finished publication apparatus.",
    failureMessage: "The final index cannot be delegated to StateChat or DANN-E."
  }
] as const satisfies readonly IndexDocketPrompt[];

export function getIndexDocketPrompt(step: number) {
  return INDEX_DOCKET_PROMPTS[Math.max(0, Math.min(INDEX_DOCKET_PROMPTS.length - 1, step))];
}

export function indexDocketComplete(step: number) {
  return step >= INDEX_DOCKET_PROMPTS.length;
}

export function evaluateIndexDocketAnswer(
  promptId: IndexDocketPromptId,
  value?: string
): IndexDocketEvaluation {
  const prompt = INDEX_DOCKET_PROMPTS.find((candidate) => candidate.id === promptId) ?? INDEX_DOCKET_PROMPTS[0];
  const ok = value === prompt.correctValue;
  let violation: StandardViolation | null = null;
  if (!ok) {
    if (value === "machine_tags" || value === "statechat_headings" || value === "danne_smoothing") violation = "altered_text";
    else if (value === "famous_only" || value === "drop_hard_refs") violation = "omitted_material_fact";
    else violation = "concealed_policy_defect";
  }
  return {
    ok,
    prompt,
    message: ok ? prompt.successMessage : prompt.failureMessage,
    violation
  };
}
