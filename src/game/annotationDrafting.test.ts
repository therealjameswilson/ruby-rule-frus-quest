import { describe, expect, it } from "vitest";
import {
  annotationDraftingComplete,
  ANNOTATION_DRAFTING_PROMPTS,
  ANNOTATION_DRAFTING_STATIONS,
  collectAnnotationDraftingSlip,
  evaluateAnnotationDraftingAnswer,
  fileAnnotationDraftingSlip,
  getAnnotationDraftingPrompt,
  getAnnotationDraftingStation
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

  it("maps every source-backed rule to one physical note station", () => {
    expect(ANNOTATION_DRAFTING_STATIONS.map((station) => station.id)).toEqual(
      ANNOTATION_DRAFTING_PROMPTS.map((prompt) => prompt.id)
    );
    expect(getAnnotationDraftingStation(-1).label).toBe("Source Line");
    expect(getAnnotationDraftingStation(99).label).toBe("Selection Ledger");
  });

  it("keeps physical note slips in a readable collect-and-file order", () => {
    const earlyContext = collectAnnotationDraftingSlip(0, "contextual_annotation");
    expect(earlyContext.ok).toBe(false);
    expect(earlyContext.expectedStation.id).toBe("published_provenance");
    expect(earlyContext.nextStep).toBe(0);

    const source = collectAnnotationDraftingSlip(0, "published_provenance");
    expect(source.ok).toBe(true);
    expect(source.station.carriedLabel).toBe("Provenance Note");

    const filedSource = fileAnnotationDraftingSlip(0, source.station.id);
    expect(filedSource.ok).toBe(true);
    expect(filedSource.nextStep).toBe(1);
    expect(filedSource.complete).toBe(false);

    const filedContext = fileAnnotationDraftingSlip(1, "contextual_annotation");
    const filedSelection = fileAnnotationDraftingSlip(filedContext.nextStep, "selectivity_mitigation");
    expect(filedSelection.nextStep).toBe(3);
    expect(filedSelection.complete).toBe(true);
  });
});
