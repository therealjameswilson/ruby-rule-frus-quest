import type { ChoiceOption } from "./types";

export type HacHearingPromptId =
  | "monitor_process"
  | "declassification_scope"
  | "sample_thirty_year_records"
  | "annual_findings_report"
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
      { key: "A", label: "Compilation, editing, preparation, and declassification process", value: "full_process" },
      { key: "B", label: "Every sentence in every volume", value: "line_edit" },
      { key: "C", label: "DANN-E shortcut queue", value: "machine_queue" }
    ],
    correctValue: "full_process",
    sourceBasis: "HAC monitors the overall compilation, editorial, preparation, and declassification process.",
    successMessage: "Correct: monitor the whole FRUS production process and keep humans accountable.",
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
    id: "sample_thirty_year_records",
    question: "HAC REVIEW: WHICH RECORDS NEED REPRESENTATIVE SAMPLING?",
    options: [
      { key: "A", label: "Documents still classified after 30 years", value: "thirty_year_classified" },
      { key: "B", label: "Only documents already cleared for publication", value: "already_cleared" },
      { key: "C", label: "Only the easiest public documents", value: "easy_public" }
    ],
    correctValue: "thirty_year_classified",
    sourceBasis: "HAC may review random samples of documents remaining classified after 30 years to evaluate agency declassification decisions.",
    successMessage: "Correct: sample the still-classified 30-year record, not only easy public files.",
    failureMessage: "Sampling only cleared or easy records hides the declassification problem."
  },
  {
    id: "annual_findings_report",
    question: "HAC REVIEW: HOW DOES PROCESS OVERSIGHT REACH THE PUBLIC RECORD?",
    options: [
      { key: "A", label: "File annual findings and recommendations", value: "annual_report" },
      { key: "B", label: "Keep process problems off the record", value: "hide_findings" },
      { key: "C", label: "Let StateChat write the findings alone", value: "statechat_report" }
    ],
    correctValue: "annual_report",
    sourceBasis: "HAC reports annually to the Secretary of State on the state of the series and makes recommendations.",
    successMessage: "Correct: file public-facing findings and recommendations from human oversight.",
    failureMessage: "Process findings cannot be hidden or delegated to a terminal."
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
