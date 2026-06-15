import { describe, expect, it } from "vitest";
import {
  evaluateVolumeConceptAnswer,
  getVolumeConceptPrompt,
  volumeConceptComplete,
  VOLUME_CONCEPT_PROMPTS
} from "./volumeConcept";

describe("volume conceptualization prompts", () => {
  it("keeps the source-backed volume concept sequence stable", () => {
    expect(VOLUME_CONCEPT_PROMPTS.map((prompt) => prompt.id)).toEqual([
      "volume_parameters",
      "strategy_sources",
      "policy_implementation"
    ]);
  });

  it("accepts the correct volume conceptualization answer for every prompt", () => {
    for (const prompt of VOLUME_CONCEPT_PROMPTS) {
      const result = evaluateVolumeConceptAnswer(prompt.id, prompt.correctValue);

      expect(result.ok).toBe(true);
      expect(result.violation).toBeNull();
      expect(result.message).toBe(prompt.successMessage);
      expect(result.prompt.sourceBasis.length).toBeGreaterThan(50);
    }
  });

  it("maps volume-concept shortcuts to standards damage categories", () => {
    const easyFile = evaluateVolumeConceptAnswer("volume_parameters", "easy_country_file");
    const machineComplete = evaluateVolumeConceptAnswer("volume_parameters", "machine_complete");
    const hideDefects = evaluateVolumeConceptAnswer("policy_implementation", "avoid_defects");

    expect(easyFile.ok).toBe(false);
    expect(easyFile.violation).toBe("omitted_material_fact");
    expect(machineComplete.violation).toBe("altered_text");
    expect(hideDefects.violation).toBe("concealed_policy_defect");
  });

  it("reports completion only after all volume-concept prompts are answered", () => {
    expect(volumeConceptComplete(0)).toBe(false);
    expect(volumeConceptComplete(VOLUME_CONCEPT_PROMPTS.length - 1)).toBe(false);
    expect(volumeConceptComplete(VOLUME_CONCEPT_PROMPTS.length)).toBe(true);
  });

  it("clamps prompt lookup to the volume-concept sequence", () => {
    expect(getVolumeConceptPrompt(-1).id).toBe("volume_parameters");
    expect(getVolumeConceptPrompt(99).id).toBe("policy_implementation");
  });
});
