import { describe, expect, it } from "vitest";
import {
  PUBLIC_CITATION_CARD_PROMPTS,
  PUBLIC_CITATION_CARD_SOURCE_URL,
  evaluatePublicCitationCardAnswer,
  getPublicCitationCardPrompt,
  publicCitationCardComplete
} from "./publicCitationCard";

describe("public citation card", () => {
  it("models the official history.state.gov FRUS citation guidance", () => {
    expect(PUBLIC_CITATION_CARD_SOURCE_URL).toBe("https://history.state.gov/historicaldocuments/citing-frus");
    expect(PUBLIC_CITATION_CARD_PROMPTS.map((prompt) => prompt.id)).toEqual([
      "document_number",
      "citation_components",
      "canonical_url",
      "legacy_digitized"
    ]);
    expect(PUBLIC_CITATION_CARD_PROMPTS[0].sourceBasis).toContain("media neutral");
    expect(PUBLIC_CITATION_CARD_PROMPTS[1].sourceBasis).toContain("series title");
    expect(PUBLIC_CITATION_CARD_PROMPTS[2].sourceBasis).toContain("history.state.gov");
    expect(PUBLIC_CITATION_CARD_PROMPTS[3].sourceBasis).toContain("superimposed");
  });

  it("completes only after every citation prompt is answered", () => {
    expect(publicCitationCardComplete(0)).toBe(false);
    expect(publicCitationCardComplete(PUBLIC_CITATION_CARD_PROMPTS.length - 1)).toBe(false);
    expect(publicCitationCardComplete(PUBLIC_CITATION_CARD_PROMPTS.length)).toBe(true);
  });

  it("accepts stable public citations and maps shortcuts to standards damage", () => {
    const first = getPublicCitationCardPrompt(0);
    const correct = evaluatePublicCitationCardAnswer(first.id, first.correctValue);
    const confidenceOnly = evaluatePublicCitationCardAnswer("citation_components", "confidence_only");
    const pretendNumbered = evaluatePublicCitationCardAnswer("legacy_digitized", "pretend_numbered");
    const screenshotFile = evaluatePublicCitationCardAnswer("canonical_url", "screenshot_file");

    expect(correct.ok).toBe(true);
    expect(correct.violation).toBeNull();
    expect(confidenceOnly.ok).toBe(false);
    expect(confidenceOnly.violation).toBe("omitted_material_fact");
    expect(pretendNumbered.ok).toBe(false);
    expect(pretendNumbered.violation).toBe("concealed_policy_defect");
    expect(screenshotFile.ok).toBe(false);
    expect(screenshotFile.violation).toBe("altered_text");
  });
});
