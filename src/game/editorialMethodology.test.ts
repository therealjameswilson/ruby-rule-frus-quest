import { describe, expect, it } from "vitest";
import {
  EDITORIAL_METHODOLOGY_PROMPTS,
  editorialMethodologyComplete,
  evaluateEditorialMethodologyAnswer,
  getEditorialMethodologyPrompt
} from "./editorialMethodology";

describe("editorial methodology ledger", () => {
  it("models the official About-the-Series editorial methodology checks", () => {
    expect(EDITORIAL_METHODOLOGY_PROMPTS.map((prompt) => prompt.id)).toEqual([
      "washington_chronology",
      "exact_transcription",
      "source_note_metadata",
      "editorial_notes"
    ]);
    expect(EDITORIAL_METHODOLOGY_PROMPTS[0].sourceBasis).toContain("Washington time");
    expect(EDITORIAL_METHODOLOGY_PROMPTS[1].sourceBasis).toContain("marginalia");
    expect(EDITORIAL_METHODOLOGY_PROMPTS[2].sourceBasis).toContain("original classification");
    expect(EDITORIAL_METHODOLOGY_PROMPTS[3].sourceBasis).toContain("pertinent material not printed");
  });

  it("completes only after every methodology prompt is answered", () => {
    expect(editorialMethodologyComplete(0)).toBe(false);
    expect(editorialMethodologyComplete(EDITORIAL_METHODOLOGY_PROMPTS.length - 1)).toBe(false);
    expect(editorialMethodologyComplete(EDITORIAL_METHODOLOGY_PROMPTS.length)).toBe(true);
  });

  it("accepts official methodology and maps shortcuts to standards violations", () => {
    const first = getEditorialMethodologyPrompt(0);
    const correct = evaluateEditorialMethodologyAnswer(first.id, first.correctValue);
    const dropMarginalia = evaluateEditorialMethodologyAnswer("exact_transcription", "drop_marginalia");
    const repositoryOnly = evaluateEditorialMethodologyAnswer("source_note_metadata", "repository_only");
    const inventedMemoir = evaluateEditorialMethodologyAnswer("editorial_notes", "invent_memoir");
    const machineUrgency = evaluateEditorialMethodologyAnswer("washington_chronology", "machine_urgency");

    expect(correct.ok).toBe(true);
    expect(correct.violation).toBeNull();
    expect(dropMarginalia.ok).toBe(false);
    expect(dropMarginalia.violation).toBe("undisclosed_deletion");
    expect(repositoryOnly.violation).toBe("omitted_material_fact");
    expect(inventedMemoir.violation).toBe("altered_text");
    expect(machineUrgency.violation).toBe("concealed_policy_defect");
  });
});
