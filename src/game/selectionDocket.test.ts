import { describe, expect, it } from "vitest";
import {
  evaluateSelectionDocketAnswer,
  getSelectionDocketPrompt,
  selectionDocketComplete,
  SELECTION_DOCKET_PROMPTS
} from "./selectionDocket";

describe("selection docket", () => {
  it("tracks the selected-subset rationale and annotation bridge", () => {
    expect(SELECTION_DOCKET_PROMPTS.map((prompt) => prompt.id)).toEqual([
      "subset_disclosure",
      "supplemental_deduplication",
      "annotation_bridge"
    ]);
    expect(SELECTION_DOCKET_PROMPTS[0].sourceBasis).toContain("selection from collected records");
    expect(SELECTION_DOCKET_PROMPTS[1].sourceBasis).toContain("Supplemental FRUS Submissions");
    expect(SELECTION_DOCKET_PROMPTS[2].sourceBasis).toContain("referenced documents and attachments");
  });

  it("completes only after both docket prompts are filed", () => {
    expect(selectionDocketComplete(0)).toBe(false);
    expect(selectionDocketComplete(SELECTION_DOCKET_PROMPTS.length - 1)).toBe(false);
    expect(selectionDocketComplete(SELECTION_DOCKET_PROMPTS.length)).toBe(true);
  });

  it("accepts the visible rationale and maps shortcuts to standards violations", () => {
    const first = getSelectionDocketPrompt(0);
    const correct = evaluateSelectionDocketAnswer(first.id, first.correctValue);
    const wholeRecord = evaluateSelectionDocketAnswer("subset_disclosure", "whole_record_claim");
    const machineSummary = evaluateSelectionDocketAnswer("subset_disclosure", "machine_summary");
    const duplicate = evaluateSelectionDocketAnswer("supplemental_deduplication", "reprint_duplicate");
    const hiddenDuplicate = evaluateSelectionDocketAnswer("supplemental_deduplication", "hide_duplicate");
    const styleHide = evaluateSelectionDocketAnswer("annotation_bridge", "style_hide");

    expect(correct.ok).toBe(true);
    expect(correct.violation).toBeNull();
    expect(wholeRecord.violation).toBe("omitted_material_fact");
    expect(machineSummary.violation).toBe("altered_text");
    expect(duplicate.violation).toBe("altered_text");
    expect(hiddenDuplicate.violation).toBe("omitted_material_fact");
    expect(styleHide.violation).toBe("concealed_policy_defect");
  });
});
