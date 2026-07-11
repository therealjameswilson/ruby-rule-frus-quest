import { describe, expect, it } from "vitest";
import {
  createGameSaveData,
  gameState,
  isSecondVolumeRegionUnlocked,
  resetGameState,
  restoreGameSaveData,
  setFinalGateCertificationState,
  setSceneState,
  unlockSecondVolumeRegion
} from "./state";

describe("second FRUS volume world unlock", () => {
  it("starts locked and unlocks with the explicit save flag", () => {
    resetGameState();

    expect(isSecondVolumeRegionUnlocked()).toBe(false);
    expect(unlockSecondVolumeRegion("Test completion")).toBe(true);
    expect(isSecondVolumeRegionUnlocked()).toBe(true);
    expect(gameState.secondVolumeUnlocked).toBe(true);
    expect(gameState.sceneProgress.secondVolumeUnlocked).toBe(1);
  });

  it("treats a published final gate as a post-completion unlock", () => {
    resetGameState();

    setFinalGateCertificationState({
      status: "published",
      nearestGate: true,
      checklistComplete: true,
      certifiedBy: "Sam",
      requiredItem: "Buckram Key",
      message: "Published"
    });

    expect(isSecondVolumeRegionUnlocked()).toBe(true);
    expect(gameState.secondVolumeUnlocked).toBe(true);
  });

  it("persists the unlock through the existing save and restore path", () => {
    resetGameState();
    setSceneState("OfficeScene", "explore", "Save-ready scene");
    unlockSecondVolumeRegion("Test completion");
    const save = createGameSaveData();

    resetGameState();
    expect(isSecondVolumeRegionUnlocked()).toBe(false);

    expect(restoreGameSaveData(save)).toBe("OfficeScene");
    expect(isSecondVolumeRegionUnlocked()).toBe(true);
    expect(gameState.sceneProgress.secondVolumeUnlocked).toBe(1);
  });

  it("normalizes legacy saves that only have the sceneProgress flag", () => {
    resetGameState();
    setSceneState("OfficeScene", "explore", "Save-ready scene");
    const save = createGameSaveData();
    save.state.secondVolumeUnlocked = false;
    save.state.sceneProgress.secondVolumeUnlocked = 1;

    resetGameState();

    expect(restoreGameSaveData(save)).toBe("OfficeScene");
    expect(isSecondVolumeRegionUnlocked()).toBe(true);
    expect(gameState.secondVolumeUnlocked).toBe(true);
  });
});
