import { describe, expect, it } from "vitest";
import {
  evaluateGpoSegmentAssemblyAnswer,
  getGpoSegmentAssemblyPrompt,
  GPO_SEGMENT_ASSEMBLY_PROMPTS,
  gpoSegmentAssemblyComplete
} from "./gpoSegmentAssembly";

describe("GPO segment assembly", () => {
  it("models publication segments and final binding from the FRUS stages page", () => {
    expect(GPO_SEGMENT_ASSEMBLY_PROMPTS.map((prompt) => prompt.id)).toEqual([
      "prepare_segments",
      "submit_final_segment",
      "bind_complete_volume"
    ]);
    expect(GPO_SEGMENT_ASSEMBLY_PROMPTS[0].sourceBasis).toContain("segments");
    expect(GPO_SEGMENT_ASSEMBLY_PROMPTS[1].sourceBasis).toContain("final submitted segment");
    expect(GPO_SEGMENT_ASSEMBLY_PROMPTS[2].sourceBasis).toContain("bound the entire volume");
  });

  it("completes only after every GPO segment prompt is answered", () => {
    expect(gpoSegmentAssemblyComplete(0)).toBe(false);
    expect(gpoSegmentAssemblyComplete(GPO_SEGMENT_ASSEMBLY_PROMPTS.length - 1)).toBe(false);
    expect(gpoSegmentAssemblyComplete(GPO_SEGMENT_ASSEMBLY_PROMPTS.length)).toBe(true);
  });

  it("accepts complete segment assembly and maps shortcuts to standards violations", () => {
    const first = getGpoSegmentAssemblyPrompt(0);
    const correct = evaluateGpoSegmentAssemblyAnswer(first.id, first.correctValue);
    const easyDocuments = evaluateGpoSegmentAssemblyAnswer("prepare_segments", "easy_documents");
    const shortcutEdition = evaluateGpoSegmentAssemblyAnswer("bind_complete_volume", "shortcut_edition");
    const loosePages = evaluateGpoSegmentAssemblyAnswer("submit_final_segment", "loose_pages");

    expect(correct.ok).toBe(true);
    expect(correct.violation).toBeNull();
    expect(easyDocuments.violation).toBe("omitted_material_fact");
    expect(shortcutEdition.violation).toBe("altered_text");
    expect(loosePages.violation).toBe("concealed_policy_defect");
  });
});
