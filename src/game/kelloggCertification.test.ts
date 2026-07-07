import { describe, expect, it } from "vitest";
import {
  evaluateKelloggCertificationAnswer,
  getKelloggCertificationPrompt,
  KELLOGG_CERTIFICATION_PROMPTS,
  kelloggCertificationComplete
} from "./kelloggCertification";

describe("Kellogg final certification", () => {
  it("covers the four final publication standards in stable order", () => {
    expect(KELLOGG_CERTIFICATION_PROMPTS.map((prompt) => prompt.id)).toEqual([
      "objectivity_accuracy",
      "visible_deletions",
      "material_facts",
      "policy_defects"
    ]);
  });

  it("requires every certification prompt before publication is complete", () => {
    expect(kelloggCertificationComplete(0)).toBe(false);
    expect(kelloggCertificationComplete(KELLOGG_CERTIFICATION_PROMPTS.length - 1)).toBe(false);
    expect(kelloggCertificationComplete(KELLOGG_CERTIFICATION_PROMPTS.length)).toBe(true);
  });

  it("accepts the source-backed answer for each final prompt", () => {
    for (const prompt of KELLOGG_CERTIFICATION_PROMPTS) {
      const result = evaluateKelloggCertificationAnswer(prompt.id, prompt.correctValue);
      expect(result.ok).toBe(true);
      expect(result.message).toBe(prompt.successMessage);
      expect(result.violation).toBeNull();
    }
  });

  it("maps wrong answers to the matching standards violation", () => {
    expect(evaluateKelloggCertificationAnswer("visible_deletions", "silent_delete")).toMatchObject({
      ok: false,
      violation: "undisclosed_deletion"
    });
    expect(evaluateKelloggCertificationAnswer("material_facts", "fast_omit")).toMatchObject({
      ok: false,
      violation: "omitted_material_fact"
    });
    expect(evaluateKelloggCertificationAnswer("policy_defects", "smooth")).toMatchObject({
      ok: false,
      violation: "concealed_policy_defect"
    });
  });

  it("clamps prompt lookup to valid bounds", () => {
    expect(getKelloggCertificationPrompt(-10).id).toBe("objectivity_accuracy");
    expect(getKelloggCertificationPrompt(999).id).toBe("policy_defects");
  });
});
