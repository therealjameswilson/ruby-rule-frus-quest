import { describe, expect, it } from "vitest";
import {
  evaluatePublicationFundingAnswer,
  getPublicationFundingPrompt,
  PUBLICATION_FUNDING_PROMPTS,
  PUBLICATION_FUNDING_SOURCE_URL,
  publicationFundingComplete
} from "./publicationFundingQueue";

describe("publication funding queue", () => {
  it("tracks funding delays as a distinct fully prepared volume gate", () => {
    expect(PUBLICATION_FUNDING_SOURCE_URL).toContain("history.state.gov");
    expect(PUBLICATION_FUNDING_PROMPTS).toHaveLength(3);
    expect(PUBLICATION_FUNDING_PROMPTS[0].sourceBasis).toContain("lack of funding");
    expect(PUBLICATION_FUNDING_PROMPTS[0].sourceBasis).toContain("fully-prepared");
  });

  it("advances only after all funding queue prompts are answered", () => {
    expect(getPublicationFundingPrompt(-1).id).toBe("fully_prepared_delay");
    expect(getPublicationFundingPrompt(99).id).toBe("public_status_note");
    expect(publicationFundingComplete(2)).toBe(false);
    expect(publicationFundingComplete(PUBLICATION_FUNDING_PROMPTS.length)).toBe(true);
  });

  it("maps unsafe funding shortcuts to standards violations", () => {
    expect(evaluatePublicationFundingAnswer("fully_prepared_delay", "hold_intact")).toMatchObject({
      ok: true,
      violation: null
    });
    expect(evaluatePublicationFundingAnswer("fully_prepared_delay", "cut_documents")).toMatchObject({
      ok: false,
      violation: "omitted_material_fact"
    });
    expect(evaluatePublicationFundingAnswer("queue_integrity", "hidden_delay")).toMatchObject({
      ok: false,
      violation: "concealed_policy_defect"
    });
    expect(evaluatePublicationFundingAnswer("public_status_note", "call_published")).toMatchObject({
      ok: false,
      violation: "altered_text"
    });
  });
});
