import type { StandardViolation } from "../systems/standardsDamage";
import type { ChoiceOption } from "./types";

export type EditorialMethodologyPromptId =
  | "washington_chronology"
  | "exact_transcription"
  | "source_note_metadata"
  | "editorial_notes";

export interface EditorialMethodologyPrompt {
  id: EditorialMethodologyPromptId;
  question: string;
  options: readonly ChoiceOption[];
  correctValue: string;
  sourceBasis: string;
  successMessage: string;
  failureMessage: string;
}

export interface EditorialMethodologyEvaluation {
  ok: boolean;
  prompt: EditorialMethodologyPrompt;
  message: string;
  violation: StandardViolation | null;
}

export const EDITORIAL_METHODOLOGY_SOURCE_URL = "https://history.state.gov/historicaldocuments/frus1917-72PubDipv07/about";

export const EDITORIAL_METHODOLOGY_PROMPTS = [
  {
    id: "washington_chronology",
    question: "EDITORIAL METHOD: HOW ARE DOCUMENTS ORDERED?",
    options: [
      { key: "A", label: "Chronologically by Washington time", value: "washington_time" },
      { key: "B", label: "By the date each memo was drafted", value: "draft_date" },
      { key: "C", label: "By DANN-E urgency score", value: "machine_urgency" }
    ],
    correctValue: "washington_time",
    sourceBasis: "The About-the-Series methodology says documents are presented chronologically according to Washington time, with memoranda of conversation placed by the conversation time and date.",
    successMessage: "Chronology ledger filed: Washington-time order preserves the documentary sequence.",
    failureMessage: "FRUS chronology cannot be rearranged by draft date or machine urgency."
  },
  {
    id: "exact_transcription",
    question: "EDITORIAL METHOD: HOW SHOULD ORIGINAL TEXT AND MARGINALIA BE HANDLED?",
    options: [
      { key: "A", label: "Reproduce as exactly as possible; note marginalia", value: "exact_with_notes" },
      { key: "B", label: "Smooth wording until the record reads cleaner", value: "smooth_record" },
      { key: "C", label: "Drop marginal notes quietly", value: "drop_marginalia" }
    ],
    correctValue: "exact_with_notes",
    sourceBasis: "The methodology says documents are reproduced as exactly as possible, including marginalia or other notations described in footnotes.",
    successMessage: "Text ledger filed: original wording and marginalia stay visible.",
    failureMessage: "Original text and marginalia need visible treatment, not smoothing or silent deletion."
  },
  {
    id: "source_note_metadata",
    question: "EDITORIAL METHOD: WHAT BELONGS IN THE FIRST SOURCE FOOTNOTE?",
    options: [
      { key: "A", label: "Source, classification, distribution, drafting, background", value: "full_source_note" },
      { key: "B", label: "Repository name only", value: "repository_only" },
      { key: "C", label: "Confidence score and generated summary", value: "confidence_summary" }
    ],
    correctValue: "full_source_note",
    sourceBasis: "The methodology says the first footnote indicates source, original classification, distribution, drafting information, background, and whether major policymakers read the document.",
    successMessage: "Source-footnote ledger filed: provenance and handling metadata are complete.",
    failureMessage: "The first footnote needs full source metadata, not a thin repository label or machine score."
  },
  {
    id: "editorial_notes",
    question: "EDITORIAL METHOD: WHAT DO EDITORIAL NOTES AND ANNOTATION DO?",
    options: [
      { key: "A", label: "Summarize pertinent material not printed and related sources", value: "summarize_related" },
      { key: "B", label: "Hide nonprinted material from the reader", value: "hide_unprinted" },
      { key: "C", label: "Invent memoir support when files are thin", value: "invent_memoir" }
    ],
    correctValue: "summarize_related",
    sourceBasis: "The methodology says editorial notes and annotation summarize pertinent material not printed, locate additional sources, cite related documents, key events, public statements, and appropriate first-hand accounts.",
    successMessage: "Annotation ledger filed: unprinted context and related sources remain traceable.",
    failureMessage: "Annotation cannot hide omitted context or invent supporting accounts."
  }
] as const satisfies readonly EditorialMethodologyPrompt[];

export function getEditorialMethodologyPrompt(step: number) {
  return EDITORIAL_METHODOLOGY_PROMPTS[Math.max(0, Math.min(EDITORIAL_METHODOLOGY_PROMPTS.length - 1, step))];
}

export function editorialMethodologyComplete(step: number) {
  return step >= EDITORIAL_METHODOLOGY_PROMPTS.length;
}

export function evaluateEditorialMethodologyAnswer(
  promptId: EditorialMethodologyPromptId,
  value?: string
): EditorialMethodologyEvaluation {
  const prompt = EDITORIAL_METHODOLOGY_PROMPTS.find((candidate) => candidate.id === promptId) ?? EDITORIAL_METHODOLOGY_PROMPTS[0];
  const ok = value === prompt.correctValue;
  let violation: StandardViolation | null = null;
  if (!ok) {
    if (value === "drop_marginalia") violation = "undisclosed_deletion";
    else if (value === "hide_unprinted" || value === "repository_only" || value === "draft_date") violation = "omitted_material_fact";
    else if (value === "invent_memoir" || value === "smooth_record") violation = "altered_text";
    else violation = "concealed_policy_defect";
  }

  return {
    ok,
    prompt,
    message: ok ? prompt.successMessage : prompt.failureMessage,
    violation
  };
}
