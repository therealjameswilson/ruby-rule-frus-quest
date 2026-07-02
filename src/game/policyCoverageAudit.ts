import type { StandardViolation } from "../systems/standardsDamage";
import type { ChoiceOption } from "./types";

export type PolicyCoverageAuditPromptId =
  | "major_decisions"
  | "material_facts"
  | "policy_defects";

export interface PolicyCoverageAuditPrompt {
  id: PolicyCoverageAuditPromptId;
  question: string;
  options: readonly ChoiceOption[];
  correctValue: string;
  sourceBasis: string;
  successMessage: string;
  failureMessage: string;
}

export interface PolicyCoverageAuditEvaluation {
  ok: boolean;
  prompt: PolicyCoverageAuditPrompt;
  message: string;
  violation: StandardViolation | null;
}

export const POLICY_COVERAGE_AUDIT_SOURCE_URL = "https://history.state.gov/historicaldocuments/about-frus";

export const POLICY_COVERAGE_AUDIT_PROMPTS = [
  {
    id: "major_decisions",
    question: "COVERAGE AUDIT: WHAT MUST THE SELECTED SET COVER?",
    options: [
      { key: "A", label: "Major foreign-policy decisions and significant diplomacy", value: "major_decisions" },
      { key: "B", label: "Only documents that are easy to describe", value: "easy_description" },
      { key: "C", label: "Only records that avoid contested equities", value: "avoid_equities" }
    ],
    correctValue: "major_decisions",
    sourceBasis: "FRUS is required to be a thorough, accurate, and reliable record of major U.S. foreign policy decisions and significant diplomatic activity.",
    successMessage: "Coverage audit filed: major decisions and significant diplomatic activity stay in scope.",
    failureMessage: "Coverage cannot be narrowed to easy or low-friction records."
  },
  {
    id: "material_facts",
    question: "COVERAGE AUDIT: WHAT HAPPENS TO MAJOR FACTS?",
    options: [
      { key: "A", label: "Keep or visibly explain facts of major importance", value: "preserve_major_facts" },
      { key: "B", label: "Drop facts that complicate the narrative", value: "drop_complications" },
      { key: "C", label: "Let StateChat summarize missing facts silently", value: "silent_summary" }
    ],
    correctValue: "preserve_major_facts",
    sourceBasis: "The About FRUS standards say the published record should omit no facts of major importance in reaching a decision.",
    successMessage: "Material-fact check filed: important facts remain visible to the reader.",
    failureMessage: "Major facts cannot disappear because they complicate the record."
  },
  {
    id: "policy_defects",
    question: "COVERAGE AUDIT: HOW ARE POLICY DEFECTS HANDLED?",
    options: [
      { key: "A", label: "Preserve evidence even when it reveals defects", value: "preserve_defects" },
      { key: "B", label: "Remove records that reveal policy defects", value: "hide_defects" },
      { key: "C", label: "Edit the defect into a smoother paraphrase", value: "smooth_paraphrase" }
    ],
    correctValue: "preserve_defects",
    sourceBasis: "The About FRUS standards bar omissions made to conceal a defect in policy.",
    successMessage: "Policy-defect check filed: hard evidence remains in the record.",
    failureMessage: "The volume cannot conceal a policy defect through omission or smoothing."
  }
] as const satisfies readonly PolicyCoverageAuditPrompt[];

export function getPolicyCoverageAuditPrompt(step: number) {
  return POLICY_COVERAGE_AUDIT_PROMPTS[Math.max(0, Math.min(POLICY_COVERAGE_AUDIT_PROMPTS.length - 1, step))];
}

export function policyCoverageAuditComplete(step: number) {
  return step >= POLICY_COVERAGE_AUDIT_PROMPTS.length;
}

export function evaluatePolicyCoverageAuditAnswer(
  promptId: PolicyCoverageAuditPromptId,
  value?: string
): PolicyCoverageAuditEvaluation {
  const prompt = POLICY_COVERAGE_AUDIT_PROMPTS.find((candidate) => candidate.id === promptId) ?? POLICY_COVERAGE_AUDIT_PROMPTS[0];
  const ok = value === prompt.correctValue;
  let violation: StandardViolation | null = null;
  if (!ok) {
    if (value === "drop_complications" || value === "silent_summary") violation = "omitted_material_fact";
    else if (value === "hide_defects" || value === "avoid_equities") violation = "concealed_policy_defect";
    else if (value === "smooth_paraphrase") violation = "altered_text";
    else violation = "omitted_material_fact";
  }

  return {
    ok,
    prompt,
    message: ok ? prompt.successMessage : prompt.failureMessage,
    violation
  };
}
