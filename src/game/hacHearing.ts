import type { ChoiceOption } from "./types";

export type HacHearingPromptId =
  | "monitor_process"
  | "declassification_scope"
  | "kellogg_standard";

export interface HacHearingPrompt {
  id: HacHearingPromptId;
  question: string;
  options: readonly ChoiceOption[];
  correctValue: string;
  sourceBasis: string;
  successMessage: string;
  failureMessage: string;
}

export interface HacHearingEvaluation {
  ok: boolean;
  prompt: HacHearingPrompt;
  message: string;
}

export const HAC_HEARING_SOURCE_URL = "https://history.state.gov/about/hac/intro";
export const FRUS_STANDARDS_SOURCE_URL = "https://history.state.gov/historicaldocuments/about-frus";

export const HAC_HEARING_PROMPTS = [
  {
    id: "monitor_process",
    question: "HAC REVIEW: WHAT DOES THE COMMITTEE MONITOR?",
    options: [
      { key: "A", label: "Overall compilation and editorial process", value: "process" },
      { key: "B", label: "Every sentence in every volume", value: "line_edit" },
      { key: "C", label: "DANN-E shortcut queue", value: "machine_queue" }
    ],
    correctValue: "process",
    sourceBasis: "HAC monitors the overall compilation and editorial process, not line-editing every volume.",
    successMessage: "Correct: monitor the process, surface problems, keep humans accountable.",
    failureMessage: "HAC is not a line editor and DANN-E gets no shortcut."
  },
  {
    id: "declassification_scope",
    question: "HAC REVIEW: WHAT DECLASSIFICATION ISSUE CAN IT REVIEW?",
    options: [
      { key: "A", label: "Department procedures and guidelines", value: "procedures" },
      { key: "B", label: "Let StateChat classify records", value: "statechat" },
      { key: "C", label: "Hide unresolved agency equities", value: "hide_equities" }
    ],
    correctValue: "procedures",
    sourceBasis: "HAC reviews declassification procedures, guidelines, and representative document samples.",
    successMessage: "Correct: procedures and guidelines belong on the hearing record.",
    failureMessage: "Classification decisions remain human and equity-bound."
  },
  {
    id: "kellogg_standard",
    question: "HAC REVIEW: WHICH KELLOGG STANDARD PROTECTS THE READER?",
    options: [
      { key: "A", label: "Omit defects so policy looks clean", value: "conceal" },
      { key: "B", label: "Show deletions and omit no major facts", value: "visible_record" },
      { key: "C", label: "Alter wording to smooth the story", value: "alter" }
    ],
    correctValue: "visible_record",
    sourceBasis: "FRUS standards require indicated deletions, no major-fact omissions, and no concealment of policy defects.",
    successMessage: "Correct: the reader sees the record and the limits on it.",
    failureMessage: "Kellogg standards forbid silent alteration, omissions, or concealment."
  }
] as const satisfies readonly HacHearingPrompt[];

export function getHacHearingPrompt(step: number) {
  return HAC_HEARING_PROMPTS[Math.max(0, Math.min(HAC_HEARING_PROMPTS.length - 1, step))];
}

export function hacHearingComplete(step: number) {
  return step >= HAC_HEARING_PROMPTS.length;
}

export function evaluateHacHearingAnswer(promptId: HacHearingPromptId, value?: string): HacHearingEvaluation {
  const prompt = HAC_HEARING_PROMPTS.find((candidate) => candidate.id === promptId) ?? HAC_HEARING_PROMPTS[0];
  const ok = value === prompt.correctValue;
  return {
    ok,
    prompt,
    message: ok ? prompt.successMessage : prompt.failureMessage
  };
}
