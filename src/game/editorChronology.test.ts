import { afterEach, describe, expect, it } from "vitest";
import { editorChronologySequence, restoreEditorChronology, shiftEditorChronology,
  validateEditorChronology, EDITOR_CHRONOLOGY_EVIDENCE, EDITOR_CHRONOLOGY_SOURCE } from "./editorChronology";
import { ABOUT_SERIES_SOURCE } from "./aboutSeries";
import { createGameSaveData, gameState, resetGameState, restoreGameSaveData, setSceneState } from "./state";
import { pixelFontMetrics } from "../systems/pixelFontMetrics";

describe("Editor chronology repair", () => {
  afterEach(() => resetGameState());
  it.each([undefined, 0, -1, 4, 2.5, NaN, Infinity])("restores invalid slot %s to the faulty sequence", value => {
    expect(restoreEditorChronology(value)).toBe(3);
    expect(validateEditorChronology(restoreEditorChronology(value)).ok).toBe(false);
  });
  it.each([1, 2, 3])("keeps all three records once in slot %s", slot => {
    const records = editorChronologySequence(slot);
    expect(new Set(records.map(record => record.id)).size).toBe(3);
    expect(records).toHaveLength(3);
    expect(records[slot - 1].id).toBe("memcon");
    expect(records.filter(record => record.id !== "memcon").map(record => record.id)).toEqual(["cable", "telegram"]);
    expect(validateEditorChronology(slot).ok).toBe(slot === 2);
  });
  it("moves in both directions without removing a record", () => {
    expect(shiftEditorChronology(3, 1)).toBe(3);
    expect(shiftEditorChronology(3, -1)).toBe(2);
    expect(shiftEditorChronology(2, -1)).toBe(1);
    expect(shiftEditorChronology(1, -1)).toBe(1);
    expect(shiftEditorChronology(1, 1)).toBe(2);
    expect(validateEditorChronology(3).message).toContain("NOT THE DRAFT DATE");
  });
  it.each([1, 2, 3])("saves unfiled slot %s without rewards or approval", slot => {
    resetGameState(); setSceneState("SilentReadScene", "explore", "CHECK PROOF TABLE");
    Object.assign(gameState.sceneProgress, { silentReadRoom: 2, silentReadReviewStep: 4,
      silentReadReviewStatus: 2, silentReadChronologySlot: slot });
    const save = createGameSaveData(); resetGameState(); restoreGameSaveData(save);
    expect(gameState.sceneProgress.silentReadChronologySlot).toBe(slot);
    expect(gameState.sceneProgress.silentReadReviewStatus).toBe(2);
    expect(gameState.sceneProgress["silentReadDecision_proof-date"]).toBeUndefined();
    expect(gameState.documentPoints).toBe(save.state.documentPoints);
    expect(gameState.inventory).toEqual(save.state.inventory);
    expect(gameState.documentCandidates).toEqual(save.state.documentCandidates);
  });
  it("leaves completed legacy chapter saves completed without a new draft", () => {
    resetGameState(); setSceneState("SilentReadScene", "explore", "EXIT EAST - VAULT");
    gameState.sceneProgress.silentReadReviewStep = 8;
    const save = createGameSaveData(); resetGameState(); restoreGameSaveData(save);
    expect(gameState.sceneProgress.silentReadReviewStep).toBe(8);
    expect(gameState.sceneProgress.silentReadChronologySlot).toBeUndefined();
  });
  it("keeps fictional evidence readable and linked to methodology", () => {
    expect(EDITOR_CHRONOLOGY_SOURCE).toBe(ABOUT_SERIES_SOURCE.url);
    expect(EDITOR_CHRONOLOGY_EVIDENCE[1]).toBe("MEMO DRAFTED: 12 JAN");
    for (const line of EDITOR_CHRONOLOGY_EVIDENCE) expect(line.length * pixelFontMetrics(8).advance).toBeLessThan(200);
  });
});
