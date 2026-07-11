import { describe, expect, it } from "vitest";
import {
  evaluateSourceNoteProvenanceAnswer,
  getSourceNoteProvenancePrompt,
  getSourceNoteProvenanceStation,
  inspectSourceNoteProvenanceStation,
  sourceNoteProvenanceComplete,
  SOURCE_NOTE_PROVENANCE_PROMPTS,
  SOURCE_NOTE_PROVENANCE_SOURCE_URL,
  SOURCE_NOTE_PROVENANCE_STATIONS
} from "./sourceNoteProvenance";

describe("source note provenance prompts", () => {
  it("keeps the Source Note 47 provenance sequence stable", () => {
    expect(SOURCE_NOTE_PROVENANCE_PROMPTS.map((prompt) => prompt.id)).toEqual([
      "repository",
      "collection",
      "folder"
    ]);
    expect(SOURCE_NOTE_PROVENANCE_SOURCE_URL).toContain("history.state.gov");
  });

  it("accepts the correct repository, collection, and folder answers", () => {
    for (const prompt of SOURCE_NOTE_PROVENANCE_PROMPTS) {
      const result = evaluateSourceNoteProvenanceAnswer(prompt.id, prompt.correctValue);

      expect(result.ok).toBe(true);
      expect(result.message).toBe(prompt.successMessage);
      expect(result.prompt.sourceBasis.length).toBeGreaterThan(40);
    }
  });

  it("rejects guessed provenance shortcuts", () => {
    const prompt = getSourceNoteProvenancePrompt(0);
    const result = evaluateSourceNoteProvenanceAnswer(prompt.id, "danne_guess");

    expect(result.ok).toBe(false);
    expect(result.message).toContain("guessed");
  });

  it("reports completion only after all provenance checks are passed", () => {
    expect(sourceNoteProvenanceComplete(0)).toBe(false);
    expect(sourceNoteProvenanceComplete(SOURCE_NOTE_PROVENANCE_PROMPTS.length - 1)).toBe(false);
    expect(sourceNoteProvenanceComplete(SOURCE_NOTE_PROVENANCE_PROMPTS.length)).toBe(true);
  });

  it("maps the provenance trail to three physical evidence stations", () => {
    expect(SOURCE_NOTE_PROVENANCE_STATIONS.map((station) => station.id)).toEqual([
      "repository",
      "collection",
      "folder"
    ]);
    expect(getSourceNoteProvenanceStation(0).shortLabel).toBe("REPO");
    expect(getSourceNoteProvenanceStation(2).shortLabel).toBe("FOLDER");
    expect(getSourceNoteProvenanceStation(Number.NaN).shortLabel).toBe("REPO");
  });

  it("advances only when the physical stations are inspected in provenance order", () => {
    const outOfOrder = inspectSourceNoteProvenanceStation(0, "folder");
    expect(outOfOrder).toMatchObject({ ok: false, complete: false, nextStep: 0 });
    expect(outOfOrder.message).toContain("repository ledger");

    const repository = inspectSourceNoteProvenanceStation(0, "repository");
    const collection = inspectSourceNoteProvenanceStation(repository.nextStep, "collection");
    const folder = inspectSourceNoteProvenanceStation(collection.nextStep, "folder");

    expect(repository).toMatchObject({ ok: true, complete: false, nextStep: 1 });
    expect(collection).toMatchObject({ ok: true, complete: false, nextStep: 2 });
    expect(folder).toMatchObject({ ok: true, complete: true, nextStep: 3 });
  });
});
