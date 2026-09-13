import { describe, expect, it } from "vitest";
import { blackVaultActionLine, blackVaultObjective, reviewCacheRefill } from "./blackVaultApproach";

describe("readable Black Vault approach", () => {
  it("only points to the cache when it can help", () => {
    expect(blackVaultObjective(false, 70)).toBe("USE REVIEW CACHE");
    expect(blackVaultObjective(false, 100)).toBe("NORTH TO DANN-E");
    expect(blackVaultObjective(true, 70)).toBe("NORTH TO DANN-E");
  });

  it("never spends a full cache or restores more than its original twenty points", () => {
    expect(reviewCacheRefill(100)).toBe(0);
    expect(reviewCacheRefill(110)).toBe(0);
    expect(reviewCacheRefill(94)).toBe(6);
    expect(reviewCacheRefill(40)).toBe(20);
  });

  it("names the real action and return destination within the HUD width", () => {
    expect(blackVaultActionLine("DANN-E Core", false)).toBe("BEGIN FINAL REVIEW");
    expect(blackVaultActionLine("DANN-E Core", true)).toBe("TO THE BINDERY");
    expect(blackVaultActionLine("Return to Proof", false)).toBe("RETURN TO PROOF");
    expect(blackVaultActionLine("Return to Archive", false)).toBe("RETURN TO ARCHIVE");
    for (const label of ["Review Cache", "Treaty Fragment III", "DANN-E Core"]) {
      expect(blackVaultActionLine(label, false)?.length).toBeLessThanOrEqual(28);
    }
    expect(blackVaultActionLine(null, false)).toBeNull();
  });
});
