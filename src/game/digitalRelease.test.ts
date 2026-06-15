import { describe, expect, it } from "vitest";
import {
  DIGITAL_RELEASE_DEVELOPER_SOURCE_URL,
  DIGITAL_RELEASE_PROMPTS,
  DIGITAL_RELEASE_SOURCE_URL,
  digitalReleaseComplete,
  evaluateDigitalReleaseAnswer,
  getDigitalReleasePrompt
} from "./digitalRelease";

describe("digital release", () => {
  it("models history.state.gov eBook and developer release requirements", () => {
    expect(DIGITAL_RELEASE_SOURCE_URL).toBe("https://history.state.gov/historicaldocuments/ebooks");
    expect(DIGITAL_RELEASE_DEVELOPER_SOURCE_URL).toBe("https://history.state.gov/developer");
    expect(DIGITAL_RELEASE_PROMPTS.map((prompt) => prompt.id)).toEqual([
      "ebook_citation",
      "tei_master",
      "ebook_catalog"
    ]);
    expect(DIGITAL_RELEASE_PROMPTS[0].sourceBasis).toContain("document numbers");
    expect(DIGITAL_RELEASE_PROMPTS[1].sourceBasis).toContain("TEI");
    expect(DIGITAL_RELEASE_PROMPTS[2].sourceBasis).toContain("Open Publication Distribution System");
  });

  it("completes only after every digital prompt is answered", () => {
    expect(digitalReleaseComplete(0)).toBe(false);
    expect(digitalReleaseComplete(DIGITAL_RELEASE_PROMPTS.length - 1)).toBe(false);
    expect(digitalReleaseComplete(DIGITAL_RELEASE_PROMPTS.length)).toBe(true);
  });

  it("accepts correct public metadata and maps shortcuts to standards damage", () => {
    const first = getDigitalReleasePrompt(0);
    const correct = evaluateDigitalReleaseAnswer(first.id, first.correctValue);
    const pageGuess = evaluateDigitalReleaseAnswer("ebook_citation", "page_guesses");
    const hidden = evaluateDigitalReleaseAnswer("ebook_catalog", "hide_until_ship");
    const summary = evaluateDigitalReleaseAnswer("tei_master", "summary_bundle");

    expect(correct.ok).toBe(true);
    expect(correct.violation).toBeNull();
    expect(pageGuess.ok).toBe(false);
    expect(pageGuess.violation).toBe("altered_text");
    expect(hidden.ok).toBe(false);
    expect(hidden.violation).toBe("omitted_material_fact");
    expect(summary.ok).toBe(false);
    expect(summary.violation).toBe("concealed_policy_defect");
  });
});
