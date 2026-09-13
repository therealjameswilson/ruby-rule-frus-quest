export type TreatmentDraft = { permission: "PRINT" | "HOLD"; withholding: "OMIT" | "APPEAL" };
export const TREATMENT_REVIEW_TITLE = "Review treatment";
export const TREATMENT_FIELDS = ["permission", "withholding"] as const;

export function restoreTreatmentDraft(code = 0): TreatmentDraft {
  const bits = Number.isInteger(code) && code >= 0 && code <= 3 ? code : 0;
  return { permission: bits & 1 ? "HOLD" : "PRINT", withholding: bits & 2 ? "APPEAL" : "OMIT" };
}
export function encodeTreatmentDraft(draft: TreatmentDraft) {
  return (draft.permission === "HOLD" ? 1 : 0) + (draft.withholding === "APPEAL" ? 2 : 0);
}
export function toggleTreatmentField(draft: TreatmentDraft, field: keyof TreatmentDraft): TreatmentDraft {
  return field === "permission"
    ? { ...draft, permission: draft.permission === "PRINT" ? "HOLD" : "PRINT" }
    : { ...draft, withholding: draft.withholding === "OMIT" ? "APPEAL" : "OMIT" };
}
export function treatmentDraftProblem(draft: TreatmentDraft): string | null {
  if (draft.permission !== "HOLD") return "PERMISSION IS PENDING\nHOLD THE FOREIGN NOTE";
  if (draft.withholding !== "APPEAL") return "KEEP THE WITHHELD FILE\nIN THE APPEAL TRAIL";
  return null;
}
