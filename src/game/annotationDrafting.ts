import type { StandardViolation } from "../systems/standardsDamage";
import type { ChoiceOption } from "./types";

export type AnnotationDraftingPromptId =
  | "published_provenance"
  | "contextual_annotation"
  | "selectivity_mitigation";

export interface AnnotationDraftingPrompt {
  id: AnnotationDraftingPromptId;
  question: string;
  options: readonly ChoiceOption[];
  correctValue: string;
  sourceBasis: string;
  successMessage: string;
  failureMessage: string;
}

export interface AnnotationDraftingEvaluation {
  ok: boolean;
  prompt: AnnotationDraftingPrompt;
  message: string;
  violation: StandardViolation | null;
}

export const ANNOTATION_DRAFTING_SOURCE_URL = "https://history.state.gov/historicaldocuments/frus-history/stages";

export const ANNOTATION_DRAFTING_PROMPTS = [
  {
    id: "published_provenance",
    question: "ANNOTATION: WHAT MUST A PUBLISHED DOCUMENT SHOW?",
    options: [
      { key: "A", label: "The provenance of the published document", value: "published_provenance" },
      { key: "B", label: "Only a short title, source trail omitted", value: "omit_provenance" },
      { key: "C", label: "A guessed archive line from DANN-E", value: "guessed_provenance" }
    ],
    correctValue: "published_provenance",
    sourceBasis: "The FRUS stages page says complex filing systems made it important to provide the provenance of documents published.",
    successMessage: "Provenance annotation drafted: the reader can trace the published document.",
    failureMessage: "Published documents need a defensible provenance trail, not a guess or omission."
  },
  {
    id: "contextual_annotation",
    question: "ANNOTATION: WHAT CONTEXT BELONGS IN RECENT VOLUMES?",
    options: [
      { key: "A", label: "Persons, events, policies, referenced documents, attachments", value: "persons_events_policies" },
      { key: "B", label: "Only names already obvious in the text", value: "obvious_names" },
      { key: "C", label: "No attachments unless they are easy to clear", value: "hide_attachments" }
    ],
    correctValue: "persons_events_policies",
    sourceBasis: "Recent annotation includes significant information about persons, events, policies, other documents referenced, and attachments.",
    successMessage: "Context annotation drafted: people, events, policies, references, and attachments are visible.",
    failureMessage: "Annotation cannot drop referenced documents or attachments just because they are hard."
  },
  {
    id: "selectivity_mitigation",
    question: "ANNOTATION: WHY EXPAND NOTES WHEN ONLY A SUBSET IS PRINTED?",
    options: [
      { key: "A", label: "To mitigate the increasing selectivity of the series", value: "mitigate_selectivity" },
      { key: "B", label: "To make omissions less noticeable", value: "hide_selectivity" },
      { key: "C", label: "To replace selection with a summary", value: "summary_replaces_record" }
    ],
    correctValue: "mitigate_selectivity",
    sourceBasis: "Since the 1960s, compilers have used expanded annotation to mitigate the increasing selectivity of the series.",
    successMessage: "Selectivity note drafted: annotation now explains context around the printed subset.",
    failureMessage: "Expanded annotation mitigates selectivity; it cannot conceal it or replace the record."
  }
] as const satisfies readonly AnnotationDraftingPrompt[];

export function getAnnotationDraftingPrompt(step: number) {
  return ANNOTATION_DRAFTING_PROMPTS[Math.max(0, Math.min(ANNOTATION_DRAFTING_PROMPTS.length - 1, step))];
}

export function annotationDraftingComplete(step: number) {
  return step >= ANNOTATION_DRAFTING_PROMPTS.length;
}

export function evaluateAnnotationDraftingAnswer(
  promptId: AnnotationDraftingPromptId,
  value?: string
): AnnotationDraftingEvaluation {
  const prompt = ANNOTATION_DRAFTING_PROMPTS.find((candidate) => candidate.id === promptId)
    ?? ANNOTATION_DRAFTING_PROMPTS[0];
  const ok = value === prompt.correctValue;
  let violation: StandardViolation | null = null;
  if (!ok) {
    if (value === "guessed_provenance") violation = "altered_text";
    else if (value === "hide_attachments" || value === "hide_selectivity") violation = "concealed_policy_defect";
    else violation = "omitted_material_fact";
  }
  return {
    ok,
    prompt,
    message: ok ? prompt.successMessage : prompt.failureMessage,
    violation
  };
}
