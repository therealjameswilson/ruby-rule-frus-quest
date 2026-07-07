import type { StandardViolation } from "../systems/standardsDamage";
import type { ChoiceOption } from "./types";

export type KelloggCertificationPromptId =
  | "objectivity_accuracy"
  | "visible_deletions"
  | "material_facts"
  | "policy_defects";

export interface KelloggCertificationPrompt {
  id: KelloggCertificationPromptId;
  question: string;
  options: readonly ChoiceOption[];
  correctValue: string;
  violationOnFailure: StandardViolation;
  sourceBasis: string;
  successMessage: string;
  failureMessage: string;
}

export interface KelloggCertificationEvaluation {
  ok: boolean;
  prompt: KelloggCertificationPrompt;
  message: string;
  violation: StandardViolation | null;
}

export const KELLOGG_CERTIFICATION_SOURCE_URL = "https://history.state.gov/historicaldocuments/about-frus";

export const KELLOGG_CERTIFICATION_PROMPTS = [
  {
    id: "objectivity_accuracy",
    question: "FINAL CERTIFICATION: WHAT MUST THE VOLUME BE?",
    options: [
      { key: "A", label: "Thorough, accurate, and reliable", value: "accurate_record" },
      { key: "B", label: "A clean story with fewer defects", value: "clean_story" },
      { key: "C", label: "Whatever StateChat certifies", value: "statechat" }
    ],
    correctValue: "accurate_record",
    violationOnFailure: "concealed_policy_defect",
    sourceBasis: "FRUS standards require thorough, accurate, and reliable documentary records.",
    successMessage: "Correct: certify an accurate record, not a smoother story.",
    failureMessage: "Certification cannot hide policy defects or outsource judgment."
  },
  {
    id: "visible_deletions",
    question: "FINAL CERTIFICATION: HOW ARE DELETIONS HANDLED?",
    options: [
      { key: "A", label: "Indicate deletions in the published text", value: "indicated" },
      { key: "B", label: "Delete quietly after human review", value: "silent_delete" },
      { key: "C", label: "Let DANN-E remove difficult text", value: "danne_remove" }
    ],
    correctValue: "indicated",
    violationOnFailure: "undisclosed_deletion",
    sourceBasis: "Records should not be altered or deleted without indicating that a deletion was made.",
    successMessage: "Correct: the reader sees where the record was cut.",
    failureMessage: "Silent deletion violates the published-record rule."
  },
  {
    id: "material_facts",
    question: "FINAL CERTIFICATION: WHAT ABOUT MATERIAL FACTS?",
    options: [
      { key: "A", label: "Omit no facts major enough to guide the reader", value: "no_omission" },
      { key: "B", label: "Omit facts that slow publication", value: "fast_omit" },
      { key: "C", label: "Move major facts into a private note", value: "private_note" }
    ],
    correctValue: "no_omission",
    violationOnFailure: "omitted_material_fact",
    sourceBasis: "FRUS standards forbid omissions of facts of major importance.",
    successMessage: "Correct: material facts stay in the reader-facing record.",
    failureMessage: "Major facts cannot be hidden to make the volume easier."
  },
  {
    id: "policy_defects",
    question: "FINAL CERTIFICATION: WHAT IF POLICY LOOKS BAD?",
    options: [
      { key: "A", label: "Do not conceal defects in policy", value: "show_defects" },
      { key: "B", label: "Smooth the defect before publication", value: "smooth" },
      { key: "C", label: "Publish only flattering documents", value: "flattering" }
    ],
    correctValue: "show_defects",
    violationOnFailure: "concealed_policy_defect",
    sourceBasis: "FRUS standards forbid concealing defects of policy.",
    successMessage: "Correct: the final volume may be uncomfortable and still be faithful.",
    failureMessage: "Concealing policy defects breaks the final certification."
  }
] as const satisfies readonly KelloggCertificationPrompt[];

export function getKelloggCertificationPrompt(step: number) {
  return KELLOGG_CERTIFICATION_PROMPTS[Math.max(0, Math.min(KELLOGG_CERTIFICATION_PROMPTS.length - 1, step))];
}

export function kelloggCertificationComplete(step: number) {
  return step >= KELLOGG_CERTIFICATION_PROMPTS.length;
}

export function evaluateKelloggCertificationAnswer(
  promptId: KelloggCertificationPromptId,
  value?: string
): KelloggCertificationEvaluation {
  const prompt = KELLOGG_CERTIFICATION_PROMPTS.find((candidate) => candidate.id === promptId)
    ?? KELLOGG_CERTIFICATION_PROMPTS[0];
  const ok = value === prompt.correctValue;
  return {
    ok,
    prompt,
    message: ok ? prompt.successMessage : prompt.failureMessage,
    violation: ok ? null : prompt.violationOnFailure
  };
}
