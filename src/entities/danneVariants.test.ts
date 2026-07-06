import { describe, expect, it } from "vitest";
import { DANNE_ENEMY_VARIANTS, danneEnemyVariant } from "./danneVariants";

describe("DANN-E enemy variants", () => {
  it("uses exactly the eight existing DANN-E variant assets", () => {
    expect(Object.keys(DANNE_ENEMY_VARIANTS)).toEqual([
      "danne-prime-humanoid",
      "danne-mark-i-prototype",
      "danne-colossus-final-form",
      "danne-cloud-form",
      "danne-executive-suit",
      "danne-swarm",
      "danne-defeated",
      "danne-ascendant"
    ]);
  });

  it("keeps one typed config per variant id", () => {
    const variants = Object.values(DANNE_ENEMY_VARIANTS);
    expect(variants).toHaveLength(8);
    expect(new Set(variants.map((variant) => variant.id)).size).toBe(variants.length);
    for (const variant of variants) {
      expect(danneEnemyVariant(variant.id)).toBe(variant);
      expect(variant.maxHp).toBeGreaterThan(0);
      expect(variant.textureKey.length).toBeGreaterThan(0);
      expect(variant.defeatMethod.length).toBeGreaterThan(0);
    }
  });

  it("requires one of the FRUS counter-tools for every DANN-E variant", () => {
    const supportedWeaknesses = new Set(["citation_stamp", "red_pencil", "review_folder"]);
    for (const variant of Object.values(DANNE_ENEMY_VARIANTS)) {
      expect(supportedWeaknesses.has(variant.weakness)).toBe(true);
    }
  });
});
