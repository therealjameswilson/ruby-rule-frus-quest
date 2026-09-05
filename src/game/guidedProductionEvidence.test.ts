import { beforeEach, describe, expect, it } from "vitest";
import { gameState, getProductionBoardReadout, resetGameState } from "./state";
import type { FrusProductionBoardStepId } from "./frusProductionBoard";

const complete = (id: FrusProductionBoardStepId) =>
  getProductionBoardReadout().steps.find((step) => step.id === id)?.complete;

describe("guided route production evidence", () => {
  beforeEach(() => resetGameState());

  it.each([0, 1, 2])("does not credit an unstamped assignment at step %s", (status) => {
    gameState.sceneProgress.officeStarterMemoStatus = status;
    expect(complete("series_concept")).toBe(false);
    expect(complete("volume_concept")).toBe(false);
  });

  it("credits the supplied plan only after its physical human stamp", () => {
    gameState.sceneProgress.officeStarterMemoStatus = 3;
    expect(complete("series_concept")).toBe(true);
    expect(complete("volume_concept")).toBe(true);
    expect(complete("record_collection")).toBe(false);
    expect(gameState.sceneProgress.seriesConceptComplete).toBeUndefined();
    expect(gameState.sceneProgress.volumeConceptComplete).toBeUndefined();
  });

  it("requires the complete archive packet, not a key or first document pickup", () => {
    gameState.sceneProgress.archiveSourceNoteCollected = 1;
    gameState.inventory.push("Master Declass Key", "Source Note 47");
    expect(complete("record_collection")).toBe(false);
    expect(complete("series_concept")).toBe(false);
    gameState.sceneProgress.archiveSourceRoomComplete = 1;
    expect(complete("record_collection")).toBe(true);
    expect(gameState.sceneProgress.recordCollectionComplete).toBeUndefined();
  });

  it("retains explicit planning and collection credit from the older desk route", () => {
    Object.assign(gameState.sceneProgress, {
      seriesConceptComplete: 1, volumeConceptComplete: 1, recordCollectionComplete: 1
    });
    expect(complete("series_concept")).toBe(true);
    expect(complete("volume_concept")).toBe(true);
    expect(complete("record_collection")).toBe(true);
  });
});
