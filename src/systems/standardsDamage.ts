import type { DocumentCandidate, WorkflowDocument } from "../game/types";

export type StandardViolation =
  | "undisclosed_deletion"
  | "omitted_material_fact"
  | "concealed_policy_defect"
  | "altered_text"
  | "missed_30_year_deadline";

export const VIOLATION_DAMAGE: Record<StandardViolation, number> = {
  undisclosed_deletion: 14,
  omitted_material_fact: 12,
  concealed_policy_defect: 18,
  altered_text: 10,
  missed_30_year_deadline: 4
} as const;

export const VIOLATION_LABEL: Record<StandardViolation, string> = {
  undisclosed_deletion: "Undisclosed deletion: withheld text must be bracketed or otherwise visible to the reader.",
  omitted_material_fact: "Omitted material fact: the volume cannot leave out evidence needed to understand the record.",
  concealed_policy_defect: "Concealed policy defect: editorial treatment cannot hide a problem in policy or process.",
  altered_text: "Altered text: source wording cannot be silently changed.",
  missed_30_year_deadline: "Missed 30-year deadline: FRUS production slipped beyond timely publication."
} as const;

type ExcisionDocument = Pick<DocumentCandidate | WorkflowDocument, "sensitivityRisk" | "annotationNeeded">;

function clampReliability(reliability: number) {
  return Math.max(0, Math.min(100, Math.round(reliability)));
}

export function excisionDamage(_doc: ExcisionDocument, bracketed: boolean): number {
  if (bracketed) return 0;
  return VIOLATION_DAMAGE.undisclosed_deletion;
}

export function applyStandardsDamage(reliability: number, violation: StandardViolation): number {
  return clampReliability(reliability - VIOLATION_DAMAGE[violation]);
}
