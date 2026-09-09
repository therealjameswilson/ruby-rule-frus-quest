import { afterEach, describe, expect, it } from "vitest";
import { restoreReleaseScope, toggleReleaseScope, validateReleaseScope, RELEASE_SCOPE_SOURCE } from "./releaseScope";
import { ABOUT_SERIES_SOURCE } from "./aboutSeries";
import { createGameSaveData, gameState, resetGameState, restoreGameSaveData, setSceneState } from "./state";

describe("released excerpt scope", () => {
  afterEach(() => resetGameState());
  it.each([0, 1, 2, 3, 4, 5, 6, 7])("accepts markings %s only when the excerpt alone is marked", mask => {
    expect(restoreReleaseScope(mask)).toBe(mask);
    expect(validateReleaseScope(mask).ok).toBe(mask === 2);
  });
  it.each([undefined, -1, 8, 2.5, NaN, Infinity])("restores corrupt markings %s as an unapproved draft", value => {
    expect(restoreReleaseScope(value)).toBe(7);
    expect(validateReleaseScope(restoreReleaseScope(value)).ok).toBe(false);
  });
  it("edits each part independently and distinguishes over-release from a missing excerpt", () => {
    let mask = toggleReleaseScope(7, 0); expect(mask).toBe(6);
    mask = toggleReleaseScope(mask, 2); expect(mask).toBe(2);
    mask = toggleReleaseScope(mask, 1); expect(mask).toBe(0);
    expect(validateReleaseScope(mask).message).toBe("KEEP THE CLEARED EXCERPT");
    expect(validateReleaseScope(6).message).toBe("A AND C ARE NOT CLEARED");
    expect(toggleReleaseScope(mask, 1)).toBe(2);
    expect(RELEASE_SCOPE_SOURCE).toBe(ABOUT_SERIES_SOURCE.url);
  });
  it.each([0, 2, 6, 7])("persists unfiled markings %s without changing records or granting review", mask => {
    resetGameState(); setSceneState("SilentReadScene", "explore", "CHECK CLASSNET");
    Object.assign(gameState.sceneProgress, { silentReadRoom: 2, silentReadReviewStep: 2,
      silentReadReviewStatus: 2, silentReadReleaseScope: mask });
    const saved = createGameSaveData(); resetGameState(); restoreGameSaveData(saved);
    expect(gameState.sceneProgress.silentReadReleaseScope).toBe(mask);
    expect(gameState.sceneProgress["silentReadDecision_classified-source"]).toBeUndefined();
    expect(gameState.documentCandidates).toEqual(saved.state.documentCandidates);
    expect(gameState.inventory).toEqual(saved.state.inventory);
    expect(gameState.documentPoints).toBe(saved.state.documentPoints);
    expect(gameState.reliability).toBe(saved.state.reliability);
  });
});
