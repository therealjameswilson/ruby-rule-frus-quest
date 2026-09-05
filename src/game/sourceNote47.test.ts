import { beforeEach, describe, expect, it } from "vitest";
import { cloneDocumentCandidate, cloneInitialDocumentCandidates } from "./documentWorkflow";
import { getCodexEntries } from "./codex";
import { createGameSaveData, fileSourceNote47Metadata, gameState, resetGameState, restoreGameSaveData } from "./state";
import { restoreSourceNote47, SOURCE_NOTE_47_LOCATOR, SOURCE_NOTE_47_METADATA, sourceNote47Pages, sourceNote47ReviewEarned } from "./sourceNote47";

const earned = {
  archiveSourceNoteCollected: 1, archiveSourceNoteRouted: 1, sourceNoteProvenanceStep: 3,
  sourceNoteProvenanceComplete: 1, aboutSeriesFirstFootnoteComplete: 1
};
const candidate = () => cloneInitialDocumentCandidates().find(document => document.id === "source_note_047")!;
beforeEach(() => resetGameState());

describe("earned Source Note 47 evidence", () => {
  it.each(Object.keys(earned))("does not manufacture metadata when %s is missing", (key) => {
    const progress = { ...earned, [key]: 0 }, document = candidate();
    expect(sourceNote47ReviewEarned(progress)).toBe(false);
    expect(restoreSourceNote47(document, progress)).toBe(document);
  });

  it("records the authored fictional locator, with explicit unknowns and no workflow changes", () => {
    const document = candidate(), result = restoreSourceNote47(document, earned);
    expect(result).toEqual({ ...document, ...SOURCE_NOTE_47_LOCATOR, firstFootnote: SOURCE_NOTE_47_METADATA });
    expect(document.repository).toBe("");
    expect(result.firstFootnote?.readership).toBeNull();
    expect(result.firstFootnote?.originalClassification).toBeNull();
    expect(restoreSourceNote47(result, earned)).toEqual(result);
    expect(sourceNote47Pages(result).join("\n")).toContain("No evidence does not prove");
  });

  it("preserves specific locators and human-authored metadata", () => {
    const document = { ...candidate(), repository: "Verified repository", collection: "Corrected collection", folder: "Human folder",
      firstFootnote: { ...SOURCE_NOTE_47_METADATA, readership: "Initials on the retained copy." } };
    expect(restoreSourceNote47(document, earned)).toEqual(document);
  });

  it("never mixes the training folder into a partially edited source trail", () => {
    const document = { ...candidate(), repository: "Another repository" };
    expect(restoreSourceNote47(document, earned)).toBe(document);
    expect(document).not.toHaveProperty("firstFootnote");
  });

  it("does not change another document or share mutable metadata", () => {
    const other = { ...candidate(), id: "telegram_001" };
    expect(restoreSourceNote47(other, earned)).toBe(other);
    const document = restoreSourceNote47(candidate(), earned), clone = cloneDocumentCandidate(document);
    clone.firstFootnote!.readership = "Changed";
    expect(document.firstFootnote?.readership).toBeNull();
    expect(SOURCE_NOTE_47_METADATA.readership).toBeNull();
  });

  it("files metadata only after human review and saves it without awarding points", () => {
    expect(fileSourceNote47Metadata()).toBeNull();
    Object.assign(gameState.sceneProgress, earned);
    const points = gameState.documentPoints;
    fileSourceNote47Metadata();
    const document = gameState.documentCandidates.find(document => document.id === "source_note_047")!;
    expect(document).toMatchObject(SOURCE_NOTE_47_LOCATOR);
    expect(gameState.documentPoints).toBe(points);
    const save = createGameSaveData();
    resetGameState();
    restoreGameSaveData(save);
    expect(gameState.documentCandidates.find(document => document.id === "source_note_047")).toEqual(document);
  });

  it("repairs a completed legacy note on Continue without changing rewards, progress or status", () => {
    Object.assign(gameState.sceneProgress, earned);
    const original = gameState.documentCandidates.find(document => document.id === "source_note_047")!;
    original.workflowState = "proofed"; original.citationComplete = true;
    gameState.documentPoints = 201;
    const save = createGameSaveData();
    restoreGameSaveData(save);
    const note = gameState.documentCandidates.find(document => document.id === "source_note_047")!;
    expect(note).toEqual({ ...original, ...SOURCE_NOTE_47_LOCATOR, firstFootnote: SOURCE_NOTE_47_METADATA });
    expect(gameState.sceneProgress).toEqual(save.state.sceneProgress);
    expect(gameState.documentPoints).toBe(201);
  });

  it("does not infer earned source evidence from a tool or downstream proof status", () => {
    gameState.inventory = ["citation_stamp"];
    const document = gameState.documentCandidates.find(document => document.id === "source_note_047")!;
    document.workflowState = "proofed"; document.citationComplete = true;
    restoreGameSaveData(createGameSaveData());
    expect(gameState.documentCandidates.find(document => document.id === "source_note_047")!.repository).toBe("");
  });

  it("reads the filed note in the field guide from this save, not global unlocks", () => {
    const document = { ...restoreSourceNote47(candidate(), earned), citationComplete: true };
    const entry = getCodexEntries("Items", [document]).find(entry => entry.id === "item-source-note-47")!;
    expect(entry.unlocked).toBe(true);
    expect(entry.lore).toContain(SOURCE_NOTE_47_LOCATOR.repository);
    expect(entry.lore).toContain("ORIGINAL CLASSIFICATION");
    expect(entry.lore).toContain("Not recorded");
    expect(entry.sourceUrl).toBeUndefined();
    expect(getCodexEntries("Items", [candidate()]).find(entry => entry.id === "item-source-note-47")!.unlocked).toBe(false);
  });
});
