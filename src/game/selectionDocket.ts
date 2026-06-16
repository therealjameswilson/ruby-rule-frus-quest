import type { StandardViolation } from "../systems/standardsDamage";
import type { ChoiceOption } from "./types";

export type SelectionDocketPromptId =
  | "subset_disclosure"
  | "supplemental_deduplication"
  | "annotation_bridge";

export interface SelectionDocketPrompt {
  id: SelectionDocketPromptId;
  question: string;
  options: readonly ChoiceOption[];
  correctValue: string;
  sourceBasis: string;
  successMessage: string;
  failureMessage: string;
}

export interface SelectionDocketEvaluation {
  ok: boolean;
  prompt: SelectionDocketPrompt;
  message: string;
  violation: StandardViolation | null;
}

export const SELECTION_DOCKET_SOURCE_URL = "https://history.state.gov/historicaldocuments/frus-history/stages";

export const SELECTION_DOCKET_PROMPTS = [
  {
    id: "subset_disclosure",
    question: "SELECTION DOCKET: WHAT DOES A PRINTED SUBSET NEED?",
    options: [
      { key: "A", label: "A visible rationale for the selected subset", value: "visible_rationale" },
      { key: "B", label: "A claim that selected records are the whole record", value: "whole_record_claim" },
      { key: "C", label: "DANN-E summary in place of omitted files", value: "machine_summary" }
    ],
    correctValue: "visible_rationale",
    sourceBasis: "The stages page describes selection from collected records, with expanded annotation mitigating the increasing selectivity of the series.",
    successMessage: "Selection docket opened: the subset is labeled as selected, not mistaken for the whole record.",
    failureMessage: "The printed subset needs a visible selection rationale, not a claim of completeness."
  },
  {
    id: "supplemental_deduplication",
    question: "SELECTION DOCKET: WHAT ABOUT SUPPLEMENTAL FRUS SUBMISSIONS?",
    options: [
      { key: "A", label: "Do not reprint records already submitted to Congress", value: "avoid_reprint" },
      { key: "B", label: "Reprint the duplicate because it is easy to clear", value: "reprint_duplicate" },
      { key: "C", label: "Hide the duplicate source trail", value: "hide_duplicate" }
    ],
    correctValue: "avoid_reprint",
    sourceBasis: "The stages page notes that documents already included in Supplemental FRUS Submissions to Congress were not printed again in regular volumes.",
    successMessage: "Supplemental-submission check filed: duplicate documents stay visible in notes, not reprinted as filler.",
    failureMessage: "The volume cannot reprint an easy duplicate or hide the supplemental source trail."
  },
  {
    id: "annotation_bridge",
    question: "SELECTION DOCKET: HOW DOES CONTEXT FOLLOW RECORDS NOT PRINTED?",
    options: [
      { key: "A", label: "Use annotation to bridge referenced documents and context", value: "annotation_bridge" },
      { key: "B", label: "Drop context once the document is not printed", value: "drop_context" },
      { key: "C", label: "Hide hard omitted files as style edits", value: "style_hide" }
    ],
    correctValue: "annotation_bridge",
    sourceBasis: "The stages page says recent annotation includes referenced documents and attachments, and helps mitigate selectivity.",
    successMessage: "Annotation bridge filed: omitted context is carried forward without pretending every file is printed.",
    failureMessage: "Context records and attachments cannot disappear just because the final printed set is selective."
  }
] as const satisfies readonly SelectionDocketPrompt[];

export function getSelectionDocketPrompt(step: number) {
  return SELECTION_DOCKET_PROMPTS[Math.max(0, Math.min(SELECTION_DOCKET_PROMPTS.length - 1, step))];
}

export function selectionDocketComplete(step: number) {
  return step >= SELECTION_DOCKET_PROMPTS.length;
}

export function evaluateSelectionDocketAnswer(
  promptId: SelectionDocketPromptId,
  value?: string
): SelectionDocketEvaluation {
  const prompt = SELECTION_DOCKET_PROMPTS.find((candidate) => candidate.id === promptId) ?? SELECTION_DOCKET_PROMPTS[0];
  const ok = value === prompt.correctValue;
  let violation: StandardViolation | null = null;
  if (!ok) {
    if (value === "machine_summary") violation = "altered_text";
    else if (value === "whole_record_claim" || value === "drop_context" || value === "hide_duplicate") violation = "omitted_material_fact";
    else if (value === "reprint_duplicate") violation = "altered_text";
    else violation = "concealed_policy_defect";
  }
  return {
    ok,
    prompt,
    message: ok ? prompt.successMessage : prompt.failureMessage,
    violation
  };
}
