import { describe, expect, it } from "vitest";
import { NARA_CATALOG_ITEM_LABEL } from "./naraCatalog";
import {
  checkWestWingNscGate,
  NSC_SOURCE_BRIEFING_ITEM_LABEL,
  NSC_SOURCE_GATE_POINT_VALUE,
  NSC_SOURCE_GATE_SOURCE_URL
} from "./westWingNsc";

describe("West Wing NSC source gate", () => {
  it("blocks Situation Room access until source coverage is filed", () => {
    const result = checkWestWingNscGate({
      inventory: [],
      repositoryCoverageMapComplete: false
    });

    expect(result.ok).toBe(false);
    expect(result.shouldClearGate).toBe(false);
    expect(result.documentPoints).toBe(0);
    expect(result.message).toContain("source index");
    expect(result.objective).toContain("source coverage");
    expect(result.sourceUrl).toBe(NSC_SOURCE_GATE_SOURCE_URL);
  });

  it("opens when the NARA Source Index is in inventory", () => {
    const result = checkWestWingNscGate({
      inventory: [NARA_CATALOG_ITEM_LABEL],
      repositoryCoverageMapComplete: false
    });

    expect(result.ok).toBe(true);
    expect(result.shouldClearGate).toBe(true);
    expect(result.documentPoints).toBe(NSC_SOURCE_GATE_POINT_VALUE);
    expect(result.itemsToAward).toEqual([NSC_SOURCE_BRIEFING_ITEM_LABEL]);
    expect(result.sourceBasis).toContain("National Security Council");
  });

  it("opens from a completed repository coverage map even without the NARA item", () => {
    const result = checkWestWingNscGate({
      inventory: [],
      repositoryCoverageMapComplete: true
    });

    expect(result.ok).toBe(true);
    expect(result.shouldClearGate).toBe(true);
  });

  it("does not farm points but recovers the briefing item on repeat entry", () => {
    const result = checkWestWingNscGate({
      alreadyCleared: true,
      inventory: [NARA_CATALOG_ITEM_LABEL],
      repositoryCoverageMapComplete: true
    });

    expect(result.ok).toBe(true);
    expect(result.shouldClearGate).toBe(false);
    expect(result.documentPoints).toBe(0);
    expect(result.itemsToAward).toEqual([NSC_SOURCE_BRIEFING_ITEM_LABEL]);
    expect(result.message).toContain("already certified");
  });
});
