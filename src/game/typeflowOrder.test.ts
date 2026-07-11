import { describe, expect, it } from "vitest";
import {
  evaluateTypeflowOrderAnswer,
  getTypeflowOrderPrompt,
  typeflowOrderComplete,
  TYPEFLOW_ORDER_PROMPTS
} from "./typeflowOrder";

describe("typeflow order", () => {
  it("models the historical shift in clearance and typesetting order", () => {
    expect(TYPEFLOW_ORDER_PROMPTS.map((prompt) => prompt.id)).toEqual([
      "modern_sequence",
      "legacy_sequence"
    ]);
    expect(TYPEFLOW_ORDER_PROMPTS[0].sourceBasis).toContain("cleared in manuscript before proceeding to typesetting");
    expect(TYPEFLOW_ORDER_PROMPTS[1].sourceBasis).toContain("typesetting process preceded declassification review");
  });

  it("completes only after both order prompts are answered", () => {
    expect(typeflowOrderComplete(0)).toBe(false);
    expect(typeflowOrderComplete(TYPEFLOW_ORDER_PROMPTS.length - 1)).toBe(false);
    expect(typeflowOrderComplete(TYPEFLOW_ORDER_PROMPTS.length)).toBe(true);
  });

  it("accepts the correct typeflow order and maps shortcuts to standards violations", () => {
    const first = getTypeflowOrderPrompt(0);
    const correct = evaluateTypeflowOrderAnswer(first.id, first.correctValue);
    const modernRace = evaluateTypeflowOrderAnswer("modern_sequence", "typeset_first_modern");
    const machineOrder = evaluateTypeflowOrderAnswer("modern_sequence", "machine_order");
    const smoothDates = evaluateTypeflowOrderAnswer("legacy_sequence", "smooth_dates");

    expect(correct.ok).toBe(true);
    expect(correct.violation).toBeNull();
    expect(modernRace.violation).toBe("omitted_material_fact");
    expect(machineOrder.violation).toBe("concealed_policy_defect");
    expect(smoothDates.violation).toBe("altered_text");
  });
});
