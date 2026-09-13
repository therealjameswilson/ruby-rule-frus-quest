import { beforeEach, describe, expect, it } from "vitest";
import { addProcessItem, createGameSaveData, gameState, getRoomGraphReadout, resetGameState, restoreGameSaveData } from "./state";

beforeEach(() => resetGameState());
const gate = (direction: string) => getRoomGraphReadout().find(room => room.id === "A1")!.lockedExitState[direction];

describe("source-room route status", () => {
  it("does not confuse Citation Stamp ownership with a complete source packet", () => {
    addProcessItem("citation_stamp");
    expect(gate("east").canOpen).toBe(false);
    expect(gate("east").blockedMessage).toContain("supporting documents");
    Object.assign(gameState.sceneProgress, { archiveSourceRoomComplete: 1, repositoryCoverageMapComplete: 1 });
    expect(gate("east").canOpen).toBe(false);
    gameState.processStamps.push("rule");
    expect(gate("east").canOpen).toBe(true);
    gameState.sceneProgress.repositoryCoverageMapComplete = 0;
    expect(gate("east").canOpen).toBe(false);
  });

  it("recognizes completed packet evidence without relying on the cached completion flag", () => {
    gameState.processStamps.push("rule", "archive");
    Object.assign(gameState.sceneProgress, { repositoryCoverageMapComplete: 1, annotationDraftingComplete: 1,
      archiveSourceNoteCollected: 1, archiveTelegramCollected: 1, archiveCrossReferenceCollected: 1 });
    expect(gate("east").canOpen).toBe(true);
    const save = createGameSaveData();
    resetGameState(); restoreGameSaveData(save);
    expect(gate("east").canOpen).toBe(true);
    gameState.sceneProgress.archiveCrossReferenceCollected = 0;
    expect(gate("east").canOpen).toBe(false);
  });

  it("marks the ordinary office return locked while notes are carried, but keeps the stacks reachable", () => {
    gameState.sceneProgress.archiveRepoWallCleared = 1;
    gameState.sceneProgress.annotationGatheredMask = 1;
    expect(gate("west").canOpen).toBe(false);
    expect(gate("west").blockedMessage).toContain("File the carried annotation notes");
    expect(gate("north").canOpen).toBe(true);
    gameState.sceneProgress.annotationDraftingComplete = 1;
    expect(gate("west")).toBeUndefined();
  });
});
