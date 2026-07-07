import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  addVolumeFragment,
  finalizeCompletionStats,
  gameState,
  getCompletionStatsReadout,
  recordDanneVariantDefeated,
  recordHiddenCollectibleFound,
  renderGameToText,
  resetGameState
} from "./state";

describe("completion stats", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    resetGameState();
  });

  afterEach(() => {
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

  it("reports completion stats through render_game_to_text", () => {
    addVolumeFragment("Proof Fragment");
    recordDanneVariantDefeated("cloud");

    const textState = JSON.parse(renderGameToText()) as {
      completionStats: ReturnType<typeof getCompletionStatsReadout>;
    };

    expect(textState.completionStats.volumePiecesCollected).toBe(1);
    expect(textState.completionStats.danneVariantsDefeated.counts.cloud).toBe(1);
  });
});
