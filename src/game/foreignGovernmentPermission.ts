import type { StandardViolation } from "../systems/standardsDamage";
import type { ChoiceOption } from "./types";

export type ForeignGovernmentPermissionPromptId =
  | "identify_foreign_government_information"
  | "seek_permission"
  | "record_permission_outcome";

export interface ForeignGovernmentPermissionPrompt {
  id: ForeignGovernmentPermissionPromptId;
  question: string;
  options: readonly ChoiceOption[];
  correctValue: string;
  sourceBasis: string;
  successMessage: string;
  failureMessage: string;
}

export interface ForeignGovernmentPermissionEvaluation {
  ok: boolean;
  prompt: ForeignGovernmentPermissionPrompt;
  message: string;
  violation: StandardViolation | null;
}

export const FOREIGN_GOVERNMENT_PERMISSION_SOURCE_URL = "https://history.state.gov/historicaldocuments/frus-history/stages";

export const FOREIGN_GOVERNMENT_PERMISSION_PROMPTS = [
  {
    id: "identify_foreign_government_information",
    question: "FOREIGN INFORMATION: WHAT MUST BE FLAGGED?",
    options: [
      { key: "A", label: "Foreign-government information inside selected documents", value: "foreign_government_info" },
      { key: "B", label: "Only U.S. agency initials", value: "us_initials_only" },
      { key: "C", label: "Nothing; the reader will infer it", value: "reader_infers" }
    ],
    correctValue: "foreign_government_info",
    sourceBasis: "The FRUS stages page says permission may be sought when selected documents include foreign-government information.",
    successMessage: "Foreign-government information flagged for permission review.",
    failureMessage: "Foreign-government information cannot be ignored or left for the reader to guess."
  },
  {
    id: "seek_permission",
    question: "FOREIGN INFORMATION: WHAT IS THE SAFE REVIEW STEP?",
    options: [
      { key: "A", label: "Seek permission through the review channel", value: "seek_permission" },
      { key: "B", label: "Print first and ask later", value: "publish_first" },
      { key: "C", label: "Let StateChat infer consent", value: "machine_consent" }
    ],
    correctValue: "seek_permission",
    sourceBasis: "When foreign-government information is selected for publication, permission may be sought before publication proceeds.",
    successMessage: "Permission request routed through human review.",
    failureMessage: "Consent cannot be guessed, outsourced to StateChat, or fixed after publication."
  },
  {
    id: "record_permission_outcome",
    question: "FOREIGN INFORMATION: WHAT MUST THE PACKET PRESERVE?",
    options: [
      { key: "A", label: "A visible permission or withholding note", value: "visible_outcome" },
      { key: "B", label: "A silent cut to keep the chapter moving", value: "silent_cut" },
      { key: "C", label: "A vague promise that permission existed", value: "vague_permission" }
    ],
    correctValue: "visible_outcome",
    sourceBasis: "The FRUS standards reject undisclosed deletions; review outcomes must remain visible in the publication packet.",
    successMessage: "Permission outcome preserved for the publication packet.",
    failureMessage: "Foreign-government review must leave visible process evidence, not a silent gap."
  }
] as const satisfies readonly ForeignGovernmentPermissionPrompt[];

export function getForeignGovernmentPermissionPrompt(step: number) {
  return FOREIGN_GOVERNMENT_PERMISSION_PROMPTS[
    Math.max(0, Math.min(FOREIGN_GOVERNMENT_PERMISSION_PROMPTS.length - 1, step))
  ];
}

export function foreignGovernmentPermissionComplete(step: number) {
  return step >= FOREIGN_GOVERNMENT_PERMISSION_PROMPTS.length;
}

export function evaluateForeignGovernmentPermissionAnswer(
  promptId: ForeignGovernmentPermissionPromptId,
  value?: string
): ForeignGovernmentPermissionEvaluation {
  const prompt = FOREIGN_GOVERNMENT_PERMISSION_PROMPTS.find((candidate) => candidate.id === promptId)
    ?? FOREIGN_GOVERNMENT_PERMISSION_PROMPTS[0];
  const ok = value === prompt.correctValue;
  let violation: StandardViolation | null = null;
  if (!ok) {
    if (value === "silent_cut") violation = "undisclosed_deletion";
    else if (value === "publish_first" || value === "machine_consent") violation = "concealed_policy_defect";
    else violation = "omitted_material_fact";
  }
  return {
    ok,
    prompt,
    message: ok ? prompt.successMessage : prompt.failureMessage,
    violation
  };
}
