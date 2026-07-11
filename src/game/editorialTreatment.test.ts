import { describe, expect, it } from "vitest";
import {
  editorialTreatmentComplete,
  EDITORIAL_TREATMENT_PROMPTS,
  evaluateEditorialTreatmentAnswer,
  getEditorialTreatmentPrompt
} from "./editorialTreatment";

describe("editorial treatment", () => {
  it("models a human editorial consultation before proofing", () => {
    expect(EDITORIAL_TREATMENT_PROMPTS.map((prompt) => prompt.id)).toEqual([
      "textual_issue_consultation",
      "style_without_altering",
      "uncertain_original_reading"
    ]);
    expect(EDITORIAL_TREATMENT_PROMPTS[0].sourceBasis).toContain("consultation with the compiler");
    expect(EDITORIAL_TREATMENT_PROMPTS[1].sourceBasis).toContain("preserving");
    expect(EDITORIAL_TREATMENT_PROMPTS[2].sourceBasis).toContain("undisclosed deletion");
  });

  it("completes only after every editorial-treatment prompt is answered", () => {
    expect(editorialTreatmentComplete(0)).toBe(false);
    expect(editorialTreatmentComplete(EDITORIAL_TREATMENT_PROMPTS.length - 1)).toBe(false);
    expect(editorialTreatmentComplete(EDITORIAL_TREATMENT_PROMPTS.length)).toBe(true);
  });

  it("accepts visible human treatment and maps shortcuts to standards violations", () => {
    const first = getEditorialTreatmentPrompt(0);
    const correct = evaluateEditorialTreatmentAnswer(first.id, first.correctValue);
    const machineDecision = evaluateEditorialTreatmentAnswer("textual_issue_consultation", "machine_decides");
    const concealedDefect = evaluateEditorialTreatmentAnswer("style_without_altering", "clean_policy_defect");
    const quietRemoval = evaluateEditorialTreatmentAnswer("textual_issue_consultation", "quiet_remove");

    expect(correct.ok).toBe(true);
    expect(correct.violation).toBeNull();
    expect(machineDecision.ok).toBe(false);
    expect(machineDecision.violation).toBe("altered_text");
    expect(concealedDefect.violation).toBe("concealed_policy_defect");
    expect(quietRemoval.violation).toBe("undisclosed_deletion");
  });
});
