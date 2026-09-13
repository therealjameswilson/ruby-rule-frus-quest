import { describe, expect, it } from "vitest";
import { encodeTreatmentDraft, restoreTreatmentDraft, toggleTreatmentField, treatmentDraftProblem } from "./referralTreatmentDraft";

describe("evidence-based treatment draft", () => {
  it("requires both permission hold and a visible appeal trail", () => {
    expect(treatmentDraftProblem(restoreTreatmentDraft(0))).toContain("PERMISSION IS PENDING");
    expect(treatmentDraftProblem(restoreTreatmentDraft(1))).toContain("APPEAL TRAIL");
    expect(treatmentDraftProblem(restoreTreatmentDraft(2))).toContain("PERMISSION IS PENDING");
    expect(treatmentDraftProblem(restoreTreatmentDraft(3))).toBeNull();
  });
  it.each([0, 1, 2, 3])("persists partial repair %s without filing it", code => {
    expect(encodeTreatmentDraft(restoreTreatmentDraft(code))).toBe(code);
  });
  it("edits only the selected field without mutating the prior draft", () => {
    const original = restoreTreatmentDraft();
    const held = toggleTreatmentField(original, "permission");
    expect(original).toEqual({ permission: "PRINT", withholding: "OMIT" });
    expect(held).toEqual({ permission: "HOLD", withholding: "OMIT" });
    expect(toggleTreatmentField(held, "withholding")).toEqual({ permission: "HOLD", withholding: "APPEAL" });
  });
  it.each([-1, 4, NaN, Infinity, 0.5])("does not interpret invalid save value %s as approved", code => {
    expect(restoreTreatmentDraft(code)).toEqual(restoreTreatmentDraft());
  });
});
