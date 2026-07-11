import { describe, expect, it } from "vitest";
import {
  evaluateFrontMatterAssemblyAnswer,
  frontMatterAssemblyComplete,
  FRONT_MATTER_ASSEMBLY_PROMPTS,
  FRONT_MATTER_ASSEMBLY_SOURCE_URL,
  getFrontMatterAssemblyPrompt
} from "./frontMatterAssembly";

describe("front matter assembly", () => {
  it("keeps the final publication apparatus sequence stable", () => {
    expect(FRONT_MATTER_ASSEMBLY_PROMPTS.map((prompt) => prompt.id)).toEqual([
      "preface_scope",
      "sources_consulted",
      "persons_abbreviations",
      "index_handoff"
    ]);
    expect(FRONT_MATTER_ASSEMBLY_SOURCE_URL).toContain("history.state.gov");
  });

  it("accepts the correct answer for every apparatus prompt", () => {
    for (const prompt of FRONT_MATTER_ASSEMBLY_PROMPTS) {
      const result = evaluateFrontMatterAssemblyAnswer(prompt.id, prompt.correctValue);

      expect(result.ok).toBe(true);
      expect(result.violation).toBeNull();
      expect(result.message).toBe(prompt.successMessage);
      expect(result.prompt.sourceBasis.length).toBeGreaterThan(60);
    }
  });

  it("maps bad final-apparatus shortcuts to standards damage categories", () => {
    const noSourceList = evaluateFrontMatterAssemblyAnswer("sources_consulted", "no_source_list");
    const renamedOffices = evaluateFrontMatterAssemblyAnswer("persons_abbreviations", "renamed_offices");
    const machineIndex = evaluateFrontMatterAssemblyAnswer("index_handoff", "machine_index");

    expect(noSourceList.violation).toBe("omitted_material_fact");
    expect(renamedOffices.violation).toBe("altered_text");
    expect(machineIndex.violation).toBe("concealed_policy_defect");
  });

  it("reports completion only after every apparatus prompt is answered", () => {
    expect(frontMatterAssemblyComplete(0)).toBe(false);
    expect(frontMatterAssemblyComplete(FRONT_MATTER_ASSEMBLY_PROMPTS.length - 1)).toBe(false);
    expect(frontMatterAssemblyComplete(FRONT_MATTER_ASSEMBLY_PROMPTS.length)).toBe(true);
  });

  it("clamps prompt lookup to the apparatus sequence", () => {
    expect(getFrontMatterAssemblyPrompt(-1).id).toBe("preface_scope");
    expect(getFrontMatterAssemblyPrompt(99).id).toBe("index_handoff");
  });
});
