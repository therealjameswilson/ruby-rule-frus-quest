import { describe, expect, it } from "vitest";
import {
  eo13526ReviewComplete,
  EO13526_REVIEW_PROMPTS,
  evaluateEo13526ReviewAnswer,
  getEo13526ReviewPrompt
} from "./eo13526Review";

describe("EO 13526 review", () => {
  it("models release standard, concurrence, and accounting from the FRUS preface", () => {
    expect(EO13526_REVIEW_PROMPTS.map((prompt) => prompt.id)).toEqual([
      "release_standard",
      "concurrence_chain",
      "accounting_record"
    ]);
    expect(EO13526_REVIEW_PROMPTS[0].sourceBasis).toContain("release all information");
    expect(EO13526_REVIEW_PROMPTS[1].sourceBasis).toContain("geographic and functional bureaus");
    expect(EO13526_REVIEW_PROMPTS[2].sourceBasis).toContain("documents excised");
  });

  it("completes only after every EO 13526 prompt is answered", () => {
    expect(eo13526ReviewComplete(0)).toBe(false);
    expect(eo13526ReviewComplete(EO13526_REVIEW_PROMPTS.length - 1)).toBe(false);
    expect(eo13526ReviewComplete(EO13526_REVIEW_PROMPTS.length)).toBe(true);
  });

  it("accepts accountable release review and maps shortcuts to standards violations", () => {
    const first = getEo13526ReviewPrompt(0);
    const correct = evaluateEo13526ReviewAnswer(first.id, first.correctValue);
    const withholdForSpeed = evaluateEo13526ReviewAnswer("release_standard", "withhold_for_speed");
    const terminalOnly = evaluateEo13526ReviewAnswer("concurrence_chain", "terminal_only");
    const silentDelete = evaluateEo13526ReviewAnswer("accounting_record", "silent_delete");
    const smoothGap = evaluateEo13526ReviewAnswer("accounting_record", "smooth_gap");

    expect(correct.ok).toBe(true);
    expect(correct.violation).toBeNull();
    expect(withholdForSpeed.violation).toBe("omitted_material_fact");
    expect(terminalOnly.violation).toBe("concealed_policy_defect");
    expect(silentDelete.violation).toBe("undisclosed_deletion");
    expect(smoothGap.violation).toBe("altered_text");
  });
});
