import { describe, expect, it } from "vitest";
import {
  DANNE_PHASE_BOASTS,
  DANNE_VARIANT_BOASTS,
  DANNE_VARIANT_IDS,
  danneBoastForPhase,
  danneBoastHoldMs,
  danneBoastsForVariantPhase,
  danneVariantBoast
} from "./danneBoasts";

describe("harmonized DANN-E boasts", () => {
  it("keeps phase lines short with bounded reading time", () => {
    for (const line of Object.values(DANNE_PHASE_BOASTS).flat()) {
      expect(line.length).toBeLessThanOrEqual(48);
      expect(danneBoastHoldMs(line)).toBeGreaterThanOrEqual(1800);
      expect(danneBoastHoldMs(line)).toBeLessThanOrEqual(3200);
    }
    expect(danneBoastHoldMs("One two three four five six seven eight nine ten")).toBe(2900);
    expect(danneBoastHoldMs("word ".repeat(100))).toBe(3200);
  });
  it("retains all eight illustrated variants and their full catalogs", () => {
    expect(DANNE_VARIANT_IDS).toEqual([
      "prime",
      "mark_i",
      "colossus",
      "cloud",
      "executive",
      "swarm",
      "defeated",
      "ascendant"
    ]);

    for (const variant of Object.values(DANNE_VARIANT_BOASTS)) {
      expect(variant.displayName).toContain("DANN-E");
      expect(variant.metaphor.length).toBeGreaterThan(20);
      expect(variant.lines.length).toBeGreaterThanOrEqual(5);
    }
  });

  it("maps combat phases to the matching variant-specific lines", () => {
    expect(danneBoastsForVariantPhase("prototype")[0]).toContain("PROTOTYPE ONLINE");
    expect(danneBoastsForVariantPhase("infiltrator")[0]).toContain("directive");
    expect(danneBoastsForVariantPhase("ascendant")[0]).toContain("absorbed");
  });

  it("preserves the scripted boss-phase API and wrapping behavior", () => {
    expect(danneBoastForPhase("cloud", DANNE_PHASE_BOASTS.cloud.length)).toBe(DANNE_PHASE_BOASTS.cloud[0]);
    expect(danneVariantBoast("swarm", DANNE_VARIANT_BOASTS.swarm.lines.length)).toBe(
      DANNE_VARIANT_BOASTS.swarm.lines[0]
    );
  });
});
