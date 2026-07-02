import { describe, expect, it } from "vitest";
import {
  evaluateRecordsAccessAnswer,
  getRecordsAccessPrompt,
  recordsAccessComplete,
  RECORDS_ACCESS_PROMPTS,
  RECORDS_ACCESS_SOURCE_URL
} from "./recordsAccess";

describe("20-year records access gate", () => {
  it("is grounded in the official About FRUS source", () => {
    expect(RECORDS_ACCESS_SOURCE_URL).toBe("https://history.state.gov/historicaldocuments/about-frus");
    expect(RECORDS_ACCESS_PROMPTS.map((prompt) => prompt.id)).toEqual([
      "twenty_year_access",
      "full_complete_access",
      "deadline_relationship"
    ]);
  });

  it("accepts the 20-year full-access route", () => {
    for (const prompt of RECORDS_ACCESS_PROMPTS) {
      const result = evaluateRecordsAccessAnswer(prompt.id, prompt.correctValue);
      expect(result.ok).toBe(true);
      expect(result.violation).toBeNull();
      expect(result.message).toBe(prompt.successMessage);
    }
  });

  it("maps bad shortcuts to Kellogg or deadline damage", () => {
    expect(evaluateRecordsAccessAnswer("twenty_year_access", "public_release_only").violation).toBe("omitted_material_fact");
    expect(evaluateRecordsAccessAnswer("twenty_year_access", "machine_ready").violation).toBe("altered_text");
    expect(evaluateRecordsAccessAnswer("full_complete_access", "clean_story").violation).toBe("concealed_policy_defect");
    expect(evaluateRecordsAccessAnswer("deadline_relationship", "late_start").violation).toBe("missed_30_year_deadline");
    expect(evaluateRecordsAccessAnswer("deadline_relationship", "cut_hard_records").violation).toBe("concealed_policy_defect");
  });

  it("tracks completion by prompt count", () => {
    expect(recordsAccessComplete(0)).toBe(false);
    expect(recordsAccessComplete(RECORDS_ACCESS_PROMPTS.length - 1)).toBe(false);
    expect(recordsAccessComplete(RECORDS_ACCESS_PROMPTS.length)).toBe(true);
    expect(getRecordsAccessPrompt(999).id).toBe("deadline_relationship");
  });
});
