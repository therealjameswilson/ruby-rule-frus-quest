import { afterEach, describe, expect, it } from "vitest";
import { createGameSaveData, gameState, resetGameState, setSceneState } from "../game/state";
import { captureCodexReturnState } from "./codexOverlay";

afterEach(() => resetGameState());

describe("codex gameplay checkpoint", () => {
  it("restores a carried document after the transient codex clears scene fields", () => {
    resetGameState();
    setSceneState("ArchiveScene", "explore", "NOTE TO TABLE");
    gameState.heldItem = "Source Note 47";
    gameState.nearestInteractable = "Research Table";
    gameState.visibleEntities = ["Source Note 47", "Research Table"];
    const before = captureCodexReturnState(gameState);
    const saved = createGameSaveData();
    setSceneState("CodexScene", "pause", "Read the handbook");
    expect(gameState.heldItem).toBeNull();
    Object.assign(gameState, before);
    expect(captureCodexReturnState(gameState)).toEqual(before);
    expect(createGameSaveData().state.heldItem).toBe(saved.state.heldItem);
    expect(gameState.currentScene).toBe("ArchiveScene");
    expect(gameState.objective).toBe("NOTE TO TABLE");
  });

  it("does not roll back earned persistent progress when restoring the overlay", () => {
    resetGameState();
    const before = captureCodexReturnState(gameState);
    gameState.sceneProgress.aboutSeriesFirstFootnoteComplete = 1;
    gameState.documentPoints += 6;
    const points = gameState.documentPoints;
    Object.assign(gameState, before);
    expect(gameState.sceneProgress.aboutSeriesFirstFootnoteComplete).toBe(1);
    expect(gameState.documentPoints).toBe(points);
  });
});
