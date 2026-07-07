import { describe, expect, it } from "vitest";
import {
  evaluateWithholdingAppealAnswer,
  getWithholdingAppealPrompt,
  withholdingAppealComplete,
  WITHHOLDING_APPEAL_PROMPTS,
  WITHHOLDING_APPEAL_SOURCE_URL
} from "./withholdingAppeal";

describe("withholding appeal prompts", () => {
  it("keeps the whole-document withholding review sequence stable", () => {
    expect(WITHHOLDING_APPEAL_PROMPTS.map((prompt) => prompt.id)).toEqual([
      "distinguish_withholding",
      "appeal_path",
      "record_outcome"
    ]);
    expect(WITHHOLDING_APPEAL_SOURCE_URL).toContain("history.state.gov");
  });

  it("accepts the correct withholding answer for every prompt", () => {
    for (const prompt of WITHHOLDING_APPEAL_PROMPTS) {
      const result = evaluateWithholdingAppealAnswer(prompt.id, prompt.correctValue);

      expect(result.ok).toBe(true);
      expect(result.violation).toBeNull();
      expect(result.message).toBe(prompt.successMessage);
      expect(result.prompt.sourceBasis.length).toBeGreaterThan(60);
    }
  });

  it("maps unsafe withholding shortcuts to standards damage categories", () => {
    const layoutProblem = evaluateWithholdingAppealAnswer("distinguish_withholding", "layout_problem");
    const machineOverride = evaluateWithholdingAppealAnswer("appeal_path", "machine_override");
    const hiddenDocument = evaluateWithholdingAppealAnswer("record_outcome", "no_trace");

    expect(layoutProblem.violation).toBe("concealed_policy_defect");
    expect(machineOverride.violation).toBe("altered_text");
    expect(hiddenDocument.violation).toBe("omitted_material_fact");
  });

  it("reports completion only after every withholding prompt is answered", () => {
    expect(withholdingAppealComplete(0)).toBe(false);
    expect(withholdingAppealComplete(WITHHOLDING_APPEAL_PROMPTS.length - 1)).toBe(false);
    expect(withholdingAppealComplete(WITHHOLDING_APPEAL_PROMPTS.length)).toBe(true);
  });

  it("clamps prompt lookup to the withholding sequence", () => {
    expect(getWithholdingAppealPrompt(-1).id).toBe("distinguish_withholding");
    expect(getWithholdingAppealPrompt(99).id).toBe("record_outcome");
  });
});
