import { describe, expect, it } from "vitest";
import { ABOUT_SERIES_SOURCE } from "./aboutSeries";
import { choiceLayout } from "../systems/choiceLayout";
import {
  evaluateSourceNoteProvenanceAnswer,
  getSourceNoteProvenancePrompt,
  getSourceNoteProvenanceStation,
  inspectSourceNoteProvenanceStation,
  readSourceNoteTrail,
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
    expect(SOURCE_NOTE_PROVENANCE_SOURCE_URL).toBe(ABOUT_SERIES_SOURCE.url);
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
    expect(getSourceNoteProvenanceStation(0).shortLabel).toBe("ARCHIVE");
    expect(getSourceNoteProvenanceStation(2).shortLabel).toBe("FOLDER");
    expect(getSourceNoteProvenanceStation(Number.NaN).shortLabel).toBe("ARCHIVE");
  });

  const orders = [
    ["repository", "collection", "folder"], ["repository", "folder", "collection"],
    ["collection", "repository", "folder"], ["collection", "folder", "repository"],
    ["folder", "repository", "collection"], ["folder", "collection", "repository"]
  ] as const;
  it.each(orders)("records clues freely: %s, %s, %s", (...order) => {
    const progress: Record<string, number> = {};
    order.forEach((id, index) => {
      const result = inspectSourceNoteProvenanceStation(progress, id);
      expect(result).toMatchObject({ ok: true, complete: index === 2, nextStep: index + 1 });
      progress.sourceNoteProvenanceMask = result.foundMask;
      progress.sourceNoteProvenanceStep = result.nextStep;
      expect(inspectSourceNoteProvenanceStation(progress, id))
        .toMatchObject({ ok: false, nextStep: index + 1, foundMask: result.foundMask });
      expect(readSourceNoteTrail(progress).found).toHaveLength(index + 1);
    });
    expect(readSourceNoteTrail(progress)).toMatchObject({ ready: true, foundMask: 7 });
    expect(progress.sourceNoteProvenanceComplete).toBeUndefined();
    expect(progress.aboutSeriesFirstFootnoteComplete).toBeUndefined();
  });

  it("restores old prefix saves without adding phantom clues to new masks", () => {
    expect(readSourceNoteTrail({ sourceNoteProvenanceStep: 2 }).found.map(clue => clue.id))
      .toEqual(["repository", "collection"]);
    expect(readSourceNoteTrail({ sourceNoteProvenanceStep: 1, sourceNoteProvenanceMask: 4 }).found.map(clue => clue.id))
      .toEqual(["folder"]);
    expect(readSourceNoteTrail({ sourceNoteProvenanceComplete: 1 })).toMatchObject({ ready: true, foundMask: 7 });
  });

  it("does not read corrupt progress as earned evidence", () => {
    for (const value of [Number.NaN, Infinity, -1]) {
      expect(readSourceNoteTrail({ sourceNoteProvenanceStep: value }).found).toEqual([]);
      expect(readSourceNoteTrail({ sourceNoteProvenanceStep: 2, sourceNoteProvenanceMask: value }).found).toEqual([]);
    }
  });

  it("requires the full first-footnote metadata packet at the final desk", () => {
    const prompt = getSourceNoteProvenancePrompt(2);
    expect(prompt.question).toContain("FIRST FOOTNOTE");
    expect(evaluateSourceNoteProvenanceAnswer("folder", "archive_path_only")).toMatchObject({ ok: false });
    expect(evaluateSourceNoteProvenanceAnswer("folder", "complete_first_footnote")).toMatchObject({ ok: true });
    expect(prompt.sourceBasis).toMatch(/classification.*distribution.*drafting.*read/i);
    const layout = choiceLayout(`${prompt.question}\n\n${prompt.sourceBasis}`, prompt.options);
    expect(layout.contextText.replace(/\n/g, " ")).toBe(prompt.sourceBasis);
    expect(layout.questionText.replace(/\n/g, " ")).toBe(prompt.question);
    expect(layout.height).toBeLessThanOrEqual(180);
    layout.rows.forEach((row, index) => {
      expect(row.text.replace(/\n/g, " ")).toBe(`[${prompt.options[index].key}] ${prompt.options[index].label}`);
    });
  });
});
