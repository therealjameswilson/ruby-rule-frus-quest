import { afterEach, describe, expect, it } from "vitest";
import { ABOUT_SERIES_SOURCE } from "./aboutSeries";
import { PROOF_COMPARISON_SOURCE, PROOF_TOKENS, proofMatchesOriginal, proofTokenText, remainingProofRepairs, repairProofToken, restoreProofRepairs } from "./proofComparison";
import { createGameSaveData, gameState, resetGameState, restoreGameSaveData, setSceneState } from "./state";
import { pixelFontMetrics } from "../systems/pixelFontMetrics";

afterEach(() => resetGameState());

describe("Proof Lens comparison", () => {
  it("has two concrete changes to find in an explicitly fictional training proof", () => {
    expect(PROOF_COMPARISON_SOURCE).toBe(ABOUT_SERIES_SOURCE.url);
    expect(PROOF_TOKENS.map((_, i) => proofTokenText(i, 0))).toEqual(["214", "We", "will", "agree."]);
    expect(remainingProofRepairs(0)).toBe(2);
  });

  it("restores the telegram designator and wording in either order, not just one edit", () => {
    for (const indices of [[0, 2], [2, 0]]) {
      const partial = repairProofToken(0, indices[0]);
      expect(remainingProofRepairs(partial)).toBe(1);
      expect(proofMatchesOriginal(partial)).toBe(false);
      const complete = repairProofToken(partial, indices[1]);
      expect(complete).toBe(3);
      expect(proofMatchesOriginal(complete)).toBe(true);
      expect(PROOF_TOKENS.map((_, i) => proofTokenText(i, complete))).toEqual(["Secto 214", "We", "may", "agree."]);
    }
  });

  it("does not invent changes or duplicate credit for correct words or repeat taps", () => {
    for (const repairs of [0, 1, 2, 3]) {
      for (const index of [-1, 1, 3, 4]) expect(repairProofToken(repairs, index)).toBe(repairs);
      const once = repairProofToken(repairs, 0);
      expect(repairProofToken(once, 0)).toBe(once);
    }
  });

  it.each([undefined, -1, 4, 1.5, NaN, Infinity])("keeps invalid save code %s uncorrected", code => {
    expect(restoreProofRepairs(code)).toBe(0);
    expect(proofMatchesOriginal(restoreProofRepairs(code))).toBe(false);
  });

  it.each([0, 1, 2, 3])("persists repair mask %i without filing or awarding a key", repairs => {
    resetGameState();
    setSceneState("SilentReadScene", "explore", "CHECK PROOF TABLE");
    Object.assign(gameState.sceneProgress, { silentReadRoom: 1, silentReadReviewStep: 7, silentReadReviewStatus: 2, silentReadProofRepairs: repairs });
    const saved = createGameSaveData();
    resetGameState();
    expect(restoreGameSaveData(saved)).toBe("SilentReadScene");
    expect(restoreProofRepairs(gameState.sceneProgress.silentReadProofRepairs)).toBe(repairs);
    expect(gameState.sceneProgress.silentReadReviewStatus).toBe(2);
    expect(gameState.sceneProgress.typesetterProofComplete).toBeUndefined();
    expect(gameState.inventory).not.toContain("buckram_key");
  });

  it("keeps native text inside separate hit areas and clear of mobile controls", () => {
    const advance = pixelFontMetrics(8).advance;
    expect(90 + 8).toBeLessThan(PROOF_TOKENS[0].y + 2 - 14);
    for (const token of PROOF_TOKENS) {
      expect(Math.max(token.original.length, token.draft.length) * advance + 12).toBeLessThanOrEqual(token.width);
      expect(token.y + 16).toBeLessThan(166);
    }
    expect(104 + PROOF_TOKENS[0].original.length * advance).toBeLessThan(235);
    expect(20 + "COMPARE ORIGINAL".length * advance).toBeLessThan(150);
  });
});
