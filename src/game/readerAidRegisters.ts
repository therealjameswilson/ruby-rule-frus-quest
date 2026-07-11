import type { StandardViolation } from "../systems/standardsDamage";
import type { ChoiceOption } from "./types";

export type ReaderAidRegisterPromptId =
  | "persons_mentioned"
  | "abbreviations_used"
  | "register_crosscheck";

export interface ReaderAidRegisterPrompt {
  id: ReaderAidRegisterPromptId;
  question: string;
  options: readonly ChoiceOption[];
  correctValue: string;
  sourceBasis: string;
  successMessage: string;
  failureMessage: string;
}

export interface ReaderAidRegisterEvaluation {
  ok: boolean;
  prompt: ReaderAidRegisterPrompt;
  message: string;
  violation: StandardViolation | null;
}

export const READER_AID_REGISTERS_SOURCE_URL = "https://history.state.gov/historicaldocuments/frus-history/stages";

export const READER_AID_REGISTER_PROMPTS = [
  {
    id: "persons_mentioned",
    question: "READER AIDS: WHO BELONGS IN THE PERSONS LIST?",
    options: [
      { key: "A", label: "Persons mentioned in the text", value: "persons_mentioned" },
      { key: "B", label: "Only famous policy principals", value: "famous_only" },
      { key: "C", label: "DANN-E confidence-ranked names", value: "machine_ranked" }
    ],
    correctValue: "persons_mentioned",
    sourceBasis: "The FRUS stages page says front matter includes lists of persons mentioned in the text.",
    successMessage: "Persons register filed: readers can identify the people named in the volume.",
    failureMessage: "The persons list cannot drop less famous people or become a machine-ranked shortcut."
  },
  {
    id: "abbreviations_used",
    question: "READER AIDS: WHAT ABBREVIATIONS BELONG IN THE REGISTER?",
    options: [
      { key: "A", label: "Abbreviations used in the text", value: "abbreviations_used" },
      { key: "B", label: "Only abbreviations in chapter titles", value: "title_only" },
      { key: "C", label: "Renamed offices for smoother prose", value: "renamed_offices" }
    ],
    correctValue: "abbreviations_used",
    sourceBasis: "The official stages specify an abbreviations-used list as part of the completed front matter.",
    successMessage: "Abbreviations register filed: agency and office shorthand stays legible.",
    failureMessage: "The abbreviations register cannot omit in-text shorthand or rename offices."
  },
  {
    id: "register_crosscheck",
    question: "READER AIDS: HOW ARE THE REGISTERS CHECKED BEFORE INDEXING?",
    options: [
      { key: "A", label: "Cross-check against proofed pages", value: "proofed_pages" },
      { key: "B", label: "Assume old registers still match", value: "reuse_old" },
      { key: "C", label: "Hide unresolved names in footnotes", value: "hide_unresolved" }
    ],
    correctValue: "proofed_pages",
    sourceBasis: "Persons and abbreviations lists are part of completed front matter and must match the proofed text readers will use.",
    successMessage: "Reader aids cross-checked: the registers match the proofed pages.",
    failureMessage: "Reader aids must be checked against the proofed text, not reused or hidden."
  }
] as const satisfies readonly ReaderAidRegisterPrompt[];

export function getReaderAidRegisterPrompt(step: number) {
  return READER_AID_REGISTER_PROMPTS[Math.max(0, Math.min(READER_AID_REGISTER_PROMPTS.length - 1, step))];
}

export function readerAidRegistersComplete(step: number) {
  return step >= READER_AID_REGISTER_PROMPTS.length;
}

export function evaluateReaderAidRegisterAnswer(
  promptId: ReaderAidRegisterPromptId,
  value?: string
): ReaderAidRegisterEvaluation {
  const prompt = READER_AID_REGISTER_PROMPTS.find((candidate) => candidate.id === promptId) ?? READER_AID_REGISTER_PROMPTS[0];
  const ok = value === prompt.correctValue;
  let violation: StandardViolation | null = null;
  if (!ok) {
    if (value === "renamed_offices") violation = "altered_text";
    else if (value === "machine_ranked" || value === "hide_unresolved") violation = "concealed_policy_defect";
    else violation = "omitted_material_fact";
  }
  return {
    ok,
    prompt,
    message: ok ? prompt.successMessage : prompt.failureMessage,
    violation
  };
}
