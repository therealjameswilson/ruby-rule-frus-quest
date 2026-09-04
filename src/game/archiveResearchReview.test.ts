import { beforeEach, describe, expect, it } from "vitest";
import { ABOUT_SERIES_SOURCE } from "./aboutSeries";
import { ARCHIVE_RESEARCH_REVIEWS, nextArchiveResearchReview, recordArchiveResearchReview } from "./archiveResearchReview";
import { addProcessItem, awardProcessStamp, createGameSaveData, gameState, getBlackVaultClimaxReadiness, resetGameState, restoreGameSaveData } from "./state";

function verifySource() {
  addProcessItem("citation_stamp");
  gameState.sceneProgress.sourceNoteProvenanceComplete = 1;
}

describe("main-route research prerequisites", () => {
  beforeEach(() => resetGameState());

  it("does not award a standards seal for owning a tool without checking provenance", () => {
    addProcessItem("citation_stamp");
    expect(recordArchiveResearchReview("standards", "retain").ok).toBe(false);
    expect(gameState.processStamps).not.toContain("rule");
    expect(nextArchiveResearchReview()).toBe("standards");
  });

  it("requires the actual Citation Stamp for both reviews", () => {
    gameState.sceneProgress.sourceNoteProvenanceComplete = 1;
    gameState.sceneProgress.annotationGatheredMask = 7;
    expect(recordArchiveResearchReview("standards", "retain").ok).toBe(false);
    expect(recordArchiveResearchReview("coverage", "coverage").ok).toBe(false);
  });

  it("keeps unsafe proposals uncommitted and gives a useful retry hint", () => {
    verifySource();
    const reliability = gameState.reliability;
    const result = recordArchiveResearchReview("standards", "omit");
    expect(result.ok).toBe(false);
    expect(result.message).toContain("policy mistakes");
    expect(gameState.processStamps).not.toContain("rule");
    expect(gameState.reliability).toBe(reliability);
    expect(recordArchiveResearchReview("standards").ok).toBe(false);
  });

  it("earns the required standards pendant through the actual research decision", () => {
    verifySource();
    expect(recordArchiveResearchReview("standards", "retain").ok).toBe(true);
    expect(gameState.processStamps).toContain("rule");
    expect(getBlackVaultClimaxReadiness().missingStamps).not.toContain("rule");
    expect(nextArchiveResearchReview()).toBe("coverage");
    expect(gameState.sceneProgress.researchCharterComplete).toBeUndefined();
  });

  it("cannot certify repository coverage from one source note or an incomplete packet", () => {
    verifySource();
    for (const mask of [0, 1, 3, 5, 6]) {
      gameState.sceneProgress.annotationGatheredMask = mask;
      expect(recordArchiveResearchReview("coverage", "coverage").ok).toBe(false);
    }
    expect(gameState.sceneProgress.repositoryCoverageMapComplete).toBeUndefined();
  });

  it("files coverage after collecting all three notes and choosing repositories plus gaps", () => {
    verifySource();
    recordArchiveResearchReview("standards", "retain");
    gameState.sceneProgress.annotationGatheredMask = 7;
    expect(recordArchiveResearchReview("coverage", "single_folder").ok).toBe(false);
    expect(gameState.sceneProgress.repositoryCoverageMapComplete).toBeUndefined();
    expect(recordArchiveResearchReview("coverage", "coverage").ok).toBe(true);
    expect(gameState.sceneProgress.repositoryCoverageMapComplete).toBe(1);
    expect(getBlackVaultClimaxReadiness().recordMissingSummary).not.toContain("repository map");
    expect(nextArchiveResearchReview()).toBeNull();
    expect(gameState.sceneProgress.annotationDraftingComplete).toBeUndefined();
    expect(gameState.sceneProgress.repositoryCoverageMapStep).toBeUndefined();
  });

  it("persists both decisions and never duplicates rewards on revisit", () => {
    verifySource();
    gameState.sceneProgress.annotationGatheredMask = 7;
    recordArchiveResearchReview("standards", "retain");
    recordArchiveResearchReview("coverage", "coverage");
    const stamps = [...gameState.processStamps];
    const points = gameState.documentPoints;
    const saved = createGameSaveData();
    resetGameState();
    restoreGameSaveData(saved);
    expect(nextArchiveResearchReview()).toBeNull();
    recordArchiveResearchReview("standards", "retain");
    recordArchiveResearchReview("coverage", "coverage");
    expect(gameState.processStamps).toEqual(stamps);
    expect(gameState.documentPoints).toBe(points);
  });

  it("honors legacy office certificates and repairs old filed packets without re-gathering", () => {
    awardProcessStamp("rule");
    expect(nextArchiveResearchReview()).toBe("coverage");
    verifySource();
    gameState.sceneProgress.annotationDraftingComplete = 1;
    expect(recordArchiveResearchReview("coverage", "coverage").ok).toBe(true);
    expect(nextArchiveResearchReview()).toBeNull();
  });

  it("keeps both decisions short, distinct, and available to keyboard or touch", () => {
    for (const review of Object.values(ARCHIVE_RESEARCH_REVIEWS)) {
      expect(review.sourceUrl).toBe(ABOUT_SERIES_SOURCE.url);
      expect(review.question.length).toBeLessThan(70);
      expect(review.options.map((option) => option.key)).toEqual(["A", "B"]);
      expect(review.options.some((option) => option.value === review.correctValue)).toBe(true);
    }
  });
});
