import { describe, expect, it } from "vitest";
import {
  evaluateReaderAidRegisterAnswer,
  getReaderAidRegisterPrompt,
  READER_AID_REGISTER_PROMPTS,
  READER_AID_REGISTERS_SOURCE_URL,
  readerAidRegistersComplete
} from "./readerAidRegisters";

describe("reader aid registers", () => {
  it("tracks persons and abbreviations as explicit front-matter work", () => {
    expect(READER_AID_REGISTERS_SOURCE_URL).toContain("history.state.gov");
    expect(READER_AID_REGISTER_PROMPTS.map((prompt) => prompt.id)).toEqual([
      "persons_mentioned",
      "abbreviations_used",
      "register_crosscheck"
    ]);
    expect(READER_AID_REGISTER_PROMPTS[0].sourceBasis).toContain("persons mentioned");
    expect(READER_AID_REGISTER_PROMPTS[1].sourceBasis).toContain("abbreviations");
  });

  it("completes only after every reader-aid prompt is filed", () => {
    expect(getReaderAidRegisterPrompt(-1).id).toBe("persons_mentioned");
    expect(getReaderAidRegisterPrompt(99).id).toBe("register_crosscheck");
    expect(readerAidRegistersComplete(2)).toBe(false);
    expect(readerAidRegistersComplete(READER_AID_REGISTER_PROMPTS.length)).toBe(true);
  });

  it("maps unsafe reader-aid shortcuts to standards violations", () => {
    expect(evaluateReaderAidRegisterAnswer("persons_mentioned", "persons_mentioned")).toMatchObject({
      ok: true,
      violation: null
    });
    expect(evaluateReaderAidRegisterAnswer("persons_mentioned", "famous_only")).toMatchObject({
      ok: false,
      violation: "omitted_material_fact"
    });
    expect(evaluateReaderAidRegisterAnswer("persons_mentioned", "machine_ranked")).toMatchObject({
      ok: false,
      violation: "concealed_policy_defect"
    });
    expect(evaluateReaderAidRegisterAnswer("abbreviations_used", "renamed_offices")).toMatchObject({
      ok: false,
      violation: "altered_text"
    });
  });
});
