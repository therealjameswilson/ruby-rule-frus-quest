import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  addVolumeFragment,
  createGameSaveData,
  finalizeCompletionStats,
  gameState,
  getCompletionStatsReadout,
  getPublicationOutcomeReadout,
  recordDanneVariantDefeated,
  recordHiddenCollectibleFound,
  recordUnresolvedEquity,
  renderGameToText,
  resetGameState,
  restoreGameSaveData,
  setCompletionStatsSuspended,
  setDialogState,
  clearDialogState,
  setChoiceState,
  clearChoiceState,
  setGameMode,
  syncCompletionStatsPlayTime,
  setSceneState
} from "./state";

describe("completion stats", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    resetGameState();
    setSceneState("OfficeScene", "explore", "CHECK MEMO");
  });

  afterEach(() => {
    setCompletionStatsSuspended(false);
    vi.useRealTimers();
  });

  it("tracks play time, DANN-E defeats, volume pieces, and hidden collectible state", () => {
    vi.setSystemTime(new Date("2026-01-01T00:01:05Z"));
    addVolumeFragment("Front Matter Fragment");
    addVolumeFragment("Source Note Fragment");
    recordDanneVariantDefeated("colossus");
    recordDanneVariantDefeated("colossus");
    recordDanneVariantDefeated("swarm");
    recordHiddenCollectibleFound("Hidden Source Cache");

    const stats = getCompletionStatsReadout();

    expect(stats.totalPlayTime).toBe("1:05");
    expect(stats.totalPlayTimeMs).toBe(65_000);
    expect(stats.danneVariantsDefeated.counts.colossus).toBe(2);
    expect(stats.danneVariantsDefeated.counts.swarm).toBe(1);
    expect(stats.danneVariantsDefeated.total).toBe(3);
    expect(stats.volumePiecesCollected).toBe(2);
    expect(stats.hiddenCollectibleFound).toBe(true);
    expect(stats.hiddenCollectibleLabel).toBe("Hidden Source Cache");
  });

  it("freezes final reliability and completion time when the run is finalized", () => {
    vi.setSystemTime(new Date("2026-01-01T00:02:00Z"));
    gameState.reliability = 73;
    addVolumeFragment("Hidden Cache Fragment");

    const finalized = finalizeCompletionStats();
    vi.setSystemTime(new Date("2026-01-01T00:05:00Z"));
    gameState.reliability = 12;
    const later = getCompletionStatsReadout();

    expect(finalized.totalPlayTime).toBe("2:00");
    expect(later.totalPlayTime).toBe("2:00");
    expect(later.finalReliabilityScore).toBe(73);
    expect(later.completed).toBe(true);
    expect(later.hiddenCollectibleFound).toBe(true);
  });

  it("resumes saved play time without counting days spent away from the game", () => {
    setSceneState("ArchiveScene", "explore", "CHECK SOURCE");
    vi.advanceTimersByTime(65_000);
    const save = createGameSaveData();
    vi.advanceTimersByTime(2 * 24 * 60 * 60 * 1000);
    expect(restoreGameSaveData(save)).toBe("ArchiveScene");
    expect(getCompletionStatsReadout().totalPlayTimeMs).toBe(65_000);
    vi.advanceTimersByTime(5000);
    expect(getCompletionStatsReadout().totalPlayTimeMs).toBe(70_000);
    const nextSave = createGameSaveData();
    vi.advanceTimersByTime(60_000);
    restoreGameSaveData(nextSave);
    expect(getCompletionStatsReadout().totalPlayTimeMs).toBe(70_000);
  });

  it("does not rewrite the clock or scores of an already completed run on Continue", () => {
    setSceneState("EndingScene", "explore", "BIND VOLUME");
    vi.advanceTimersByTime(120_000);
    finalizeCompletionStats();
    setSceneState("TrueEndingScene", "ending", "PUBLISHED");
    const save = createGameSaveData();
    const recorded = structuredClone(save.state.completionStats);
    vi.advanceTimersByTime(24 * 60 * 60 * 1000);
    restoreGameSaveData(save);
    expect(gameState.completionStats).toEqual(recorded);
    expect(getCompletionStatsReadout().totalPlayTimeMs).toBe(120_000);
  });

  it("excludes title, profile, debug and final screens, but counts playable binding", () => {
    setSceneState("TitleScene", "title", "START");
    vi.advanceTimersByTime(10_000);
    setSceneState("CharacterCreateScene", "choice", "NAME");
    vi.advanceTimersByTime(10_000);
    setSceneState("SpriteGallery", "debug", "SPRITES");
    vi.advanceTimersByTime(10_000);
    expect(getCompletionStatsReadout().totalPlayTimeMs).toBe(0);
    setSceneState("EndingScene", "explore", "BIND");
    vi.advanceTimersByTime(1000);
    setGameMode("ending");
    vi.advanceTimersByTime(10_000);
    expect(getCompletionStatsReadout().totalPlayTimeMs).toBe(1000);
  });

  it("excludes pause time across repeated opens, saves and closes", () => {
    vi.advanceTimersByTime(1000);
    setGameMode("pause");
    vi.advanceTimersByTime(60_000);
    expect(createGameSaveData().state.completionStats.totalPlayTimeMs).toBe(1000);
    vi.advanceTimersByTime(60_000);
    expect(getCompletionStatsReadout().totalPlayTimeMs).toBe(1000);
    setGameMode("explore");
    vi.advanceTimersByTime(500);
    setGameMode("pause");
    setGameMode("pause");
    vi.advanceTimersByTime(10_000);
    setGameMode("explore");
    vi.advanceTimersByTime(500);
    expect(getCompletionStatsReadout().totalPlayTimeMs).toBe(2000);
  });

  it("counts dialogue and workflow decisions without a pause penalty", () => {
    setDialogState("COMPILER", "Check the source.");
    vi.advanceTimersByTime(1000);
    setGameMode("pause");
    vi.advanceTimersByTime(9000);
    setGameMode("dialog");
    vi.advanceTimersByTime(1000);
    clearDialogState();
    setChoiceState("Keep the citation?", []);
    vi.advanceTimersByTime(1000);
    clearChoiceState();
    expect(getCompletionStatsReadout().totalPlayTimeMs).toBe(3000);
  });

  it("does not count background time or the waiting-for-resume gesture", () => {
    vi.advanceTimersByTime(1000);
    setCompletionStatsSuspended(true);
    vi.advanceTimersByTime(60_000);
    setCompletionStatsSuspended(true);
    expect(createGameSaveData().state.completionStats.totalPlayTimeMs).toBe(1000);
    vi.advanceTimersByTime(60_000);
    expect(getCompletionStatsReadout().totalPlayTimeMs).toBe(1000);
    setCompletionStatsSuspended(false);
    vi.advanceTimersByTime(500);
    expect(getCompletionStatsReadout().totalPlayTimeMs).toBe(1500);
    setGameMode("pause");
    setCompletionStatsSuspended(true);
    vi.advanceTimersByTime(60_000);
    setCompletionStatsSuspended(false);
    vi.advanceTimersByTime(60_000);
    expect(getCompletionStatsReadout().totalPlayTimeMs).toBe(1500);
    setGameMode("explore");
    vi.advanceTimersByTime(500);
    expect(getCompletionStatsReadout().totalPlayTimeMs).toBe(2000);
  });

  it("checkpoints the codex's transient return before restoring the parent fields", () => {
    vi.advanceTimersByTime(1000);
    const parent = { currentScene: gameState.currentScene, mode: gameState.mode };
    setSceneState("CodexScene", "pause", "CODEX");
    vi.advanceTimersByTime(60_000);
    syncCompletionStatsPlayTime();
    Object.assign(gameState, parent);
    vi.advanceTimersByTime(1000);
    expect(getCompletionStatsReadout().totalPlayTimeMs).toBe(2000);
  });

  it("preserves legacy accrued time when restoring a paused run", () => {
    const save = createGameSaveData();
    save.state.completionStats.totalPlayTimeMs = 123_456;
    vi.advanceTimersByTime(60_000);
    restoreGameSaveData(save);
    setGameMode("pause");
    vi.advanceTimersByTime(10_000);
    expect(getCompletionStatsReadout().totalPlayTimeMs).toBe(123_456);
    setGameMode("explore");
    vi.advanceTimersByTime(1000);
    expect(getCompletionStatsReadout().totalPlayTimeMs).toBe(124_456);
  });

  it("branches publication outcome based on unresolved equities", () => {
    expect(getPublicationOutcomeReadout()).toMatchObject({
      id: "published_clean",
      label: "Published clean",
      unresolvedEquities: 0
    });

    recordUnresolvedEquity("Wrong agency equity selected");
    const finalized = finalizeCompletionStats();

    expect(finalized.unresolvedEquities).toBe(1);
    expect(finalized.publicationOutcome).toMatchObject({
      id: "published_under_appeal",
      label: "Published under appeal",
      unresolvedEquities: 1
    });
  });

  it("reports completion stats through render_game_to_text", () => {
    addVolumeFragment("Proof Fragment");
    recordDanneVariantDefeated("cloud");
    recordUnresolvedEquity("Network routing gate failed");

    const textState = JSON.parse(renderGameToText()) as {
      unresolvedEquities: number;
      publicationOutcome: ReturnType<typeof getPublicationOutcomeReadout>;
      completionStats: ReturnType<typeof getCompletionStatsReadout>;
    };

    expect(textState.unresolvedEquities).toBe(1);
    expect(textState.publicationOutcome.id).toBe("published_under_appeal");
    expect(textState.completionStats.volumePiecesCollected).toBe(1);
    expect(textState.completionStats.danneVariantsDefeated.counts.cloud).toBe(1);
    expect(textState.completionStats.publicationOutcome.id).toBe("published_under_appeal");
  });
});
