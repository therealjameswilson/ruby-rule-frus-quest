import { describe, expect, it } from "vitest";
import {
  evaluateSeriesConceptAnswer,
  getSeriesConceptPrompt,
  seriesConceptComplete,
  SERIES_CONCEPT_PROMPTS
} from "./seriesConcept";

describe("series conceptualization prompts", () => {
  it("keeps the grand conceptualization sequence stable", () => {
    expect(SERIES_CONCEPT_PROMPTS.map((prompt) => prompt.id)).toEqual([
      "series_scheme",
      "volume_fit",
      "special_topic"
    ]);
  });

  it("accepts the source-backed FRUS series planning answer for every prompt", () => {
    for (const prompt of SERIES_CONCEPT_PROMPTS) {
      const result = evaluateSeriesConceptAnswer(prompt.id, prompt.correctValue);

      expect(result.ok).toBe(true);
      expect(result.violation).toBeNull();
      expect(result.message).toBe(prompt.successMessage);
      expect(result.prompt.sourceBasis.length).toBeGreaterThan(50);
    }
  });

  it("rejects shortcut conceptualization and records standards damage categories", () => {
    const machineFolder = evaluateSeriesConceptAnswer("series_scheme", "statechat_folder");
    const easyStory = evaluateSeriesConceptAnswer("series_scheme", "easy_story");
    const hideDefects = evaluateSeriesConceptAnswer("special_topic", "avoid_defects");

    expect(machineFolder.ok).toBe(false);
    expect(machineFolder.violation).toBe("altered_text");
    expect(easyStory.violation).toBe("omitted_material_fact");
    expect(hideDefects.violation).toBe("concealed_policy_defect");
  });

  it("reports completion only after every series-planning prompt is answered", () => {
    expect(seriesConceptComplete(0)).toBe(false);
    expect(seriesConceptComplete(SERIES_CONCEPT_PROMPTS.length - 1)).toBe(false);
    expect(seriesConceptComplete(SERIES_CONCEPT_PROMPTS.length)).toBe(true);
  });

  it("clamps prompt lookup to valid steps", () => {
    expect(getSeriesConceptPrompt(-1).id).toBe("series_scheme");
    expect(getSeriesConceptPrompt(99).id).toBe("special_topic");
  });
});
