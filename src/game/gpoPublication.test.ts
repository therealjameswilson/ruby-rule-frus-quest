import { describe, expect, it } from "vitest";
import {
  evaluateGpoPublicationAnswer,
  getGpoPublicationPrompt,
  GPO_PUBLICATION_PROMPTS,
  gpoPublicationComplete
} from "./gpoPublication";

describe("GPO publication handoff", () => {
  it("models the publishing stage from the FRUS stages page", () => {
    expect(GPO_PUBLICATION_PROMPTS.map((prompt) => prompt.id)).toEqual([
      "publication_contract",
      "volume_binding",
      "funding_delay"
    ]);
    expect(GPO_PUBLICATION_PROMPTS[0].sourceBasis).toContain("Government Printing Office");
    expect(GPO_PUBLICATION_PROMPTS[1].sourceBasis).toContain("bind the entire volume");
    expect(GPO_PUBLICATION_PROMPTS[2].sourceBasis).toContain("lack of funding");
  });

  it("completes only after every handoff prompt is answered", () => {
    expect(gpoPublicationComplete(0)).toBe(false);
    expect(gpoPublicationComplete(GPO_PUBLICATION_PROMPTS.length - 1)).toBe(false);
    expect(gpoPublicationComplete(GPO_PUBLICATION_PROMPTS.length)).toBe(true);
  });

  it("accepts the correct publishing handoff and maps shortcuts to standards violations", () => {
    const first = getGpoPublicationPrompt(0);
    const correct = evaluateGpoPublicationAnswer(first.id, first.correctValue);
    const cutPages = evaluateGpoPublicationAnswer("funding_delay", "cut_pages");
    const directRelease = evaluateGpoPublicationAnswer("publication_contract", "statechat_release");

    expect(correct.ok).toBe(true);
    expect(correct.violation).toBeNull();
    expect(cutPages.ok).toBe(false);
    expect(cutPages.violation).toBe("omitted_material_fact");
    expect(directRelease.ok).toBe(false);
    expect(directRelease.violation).toBe("altered_text");
  });
});
