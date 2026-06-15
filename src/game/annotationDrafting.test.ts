import { describe, expect, it } from "vitest";
import {
  annotationDraftingComplete,
  ANNOTATION_DRAFTING_PROMPTS,
  evaluateAnnotationDraftingAnswer,
  getAnnotationDraftingPrompt
} from "./annotationDrafting";

describe("annotation drafting prompts", () => {
  it("keeps the source-backed annotation sequence stable", () => {
    expect(ANNOTATION_DRAFTING_PROMPTS.map((prompt) => prompt.id)).toEqual([
      "published_provenance",
      "contextual_annotation",
      "selectivity_mitigation"
    ]);
  });

  it("accepts the correct annotation answer for every prompt", () => {
    for (const prompt of ANNOTATION_DRAFTING_PROMPTS) {
      const result = evaluateAnnotationDraftingAnswer(prompt.id, prompt.correctValue);

      expect(result.ok).toBe(true);
      expect(result.violation).toBeNull();
      expect(result.message).toBe(prompt.successMessage);
      expect(result.prompt.sourceBasis.length).toBeGreaterThan(60);
    }
  });

  it("maps annotation shortcuts to standards damage categories", () => {
    const omitProvenance = evaluateAnnotationDraftingAnswer("published_provenance", "omit_provenance");
    const guessedProvenance = evaluateAnnotationDraftingAnswer("published_provenance", "guessed_provenance");
    const hiddenAttachments = evaluateAnnotationDraftingAnswer("contextual_annotation", "hide_attachments");

    expect(omitProvenance.ok).toBe(false);
    expect(omitProvenance.violation).toBe("omitted_material_fact");
    expect(guessedProvenance.violation).toBe("altered_text");
    expect(hiddenAttachments.violation).toBe("concealed_policy_defect");
  });

  it("reports completion only after every annotation prompt is answered", () => {
    expect(annotationDraftingComplete(0)).toBe(false);
    expect(annotationDraftingComplete(ANNOTATION_DRAFTING_PROMPTS.length - 1)).toBe(false);
    expect(annotationDraftingComplete(ANNOTATION_DRAFTING_PROMPTS.length)).toBe(true);
  });

  it("clamps prompt lookup to the annotation sequence", () => {
    expect(getAnnotationDraftingPrompt(-1).id).toBe("published_provenance");
    expect(getAnnotationDraftingPrompt(99).id).toBe("selectivity_mitigation");
  });
});
