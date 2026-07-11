import { describe, expect, it } from "vitest";
import {
  clearanceProcedureComplete,
  CLEARANCE_PROCEDURE_PROMPTS,
  evaluateClearanceProcedureAnswer,
  getClearanceProcedurePrompt
} from "./clearanceProcedure";

describe("clearance procedure", () => {
  it("models the historical declassification-review lane from the FRUS stages page", () => {
    expect(CLEARANCE_PROCEDURE_PROMPTS.map((prompt) => prompt.id)).toEqual([
      "separate_clearance_function",
      "era_review_lane",
      "agency_equity_lane"
    ]);
    expect(CLEARANCE_PROCEDURE_PROMPTS[0].sourceBasis).toContain("separately from compilation");
    expect(CLEARANCE_PROCEDURE_PROMPTS[1].sourceBasis).toContain("after 1980");
    expect(CLEARANCE_PROCEDURE_PROMPTS[2].sourceBasis).toContain("other agencies");
  });

  it("completes only after every clearance-procedure prompt is answered", () => {
    expect(clearanceProcedureComplete(0)).toBe(false);
    expect(clearanceProcedureComplete(CLEARANCE_PROCEDURE_PROMPTS.length - 1)).toBe(false);
    expect(clearanceProcedureComplete(CLEARANCE_PROCEDURE_PROMPTS.length)).toBe(true);
  });

  it("accepts accountable review lanes and maps shortcuts to standards violations", () => {
    const first = getClearanceProcedurePrompt(0);
    const correct = evaluateClearanceProcedureAnswer(first.id, first.correctValue);
    const stateChat = evaluateClearanceProcedureAnswer("separate_clearance_function", "statechat_final");
    const inferred = evaluateClearanceProcedureAnswer("agency_equity_lane", "infer_approval");
    const silentCut = evaluateClearanceProcedureAnswer("agency_equity_lane", "silent_cut");

    expect(correct.ok).toBe(true);
    expect(correct.violation).toBeNull();
    expect(stateChat.violation).toBe("concealed_policy_defect");
    expect(inferred.violation).toBe("omitted_material_fact");
    expect(silentCut.violation).toBe("undisclosed_deletion");
  });
});
