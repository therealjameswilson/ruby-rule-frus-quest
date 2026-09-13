import { describe, expect, it } from "vitest";
import { readDanneBossCheckpoint, writeDanneBossCheckpoint } from "./danneBossCheckpoint";

describe("saved DANN-E combat checkpoint", () => {
  it("round-trips phase and earned damage through the existing numeric save fields", () => {
    const progress: Record<string, number> = { statutoryClockTenths: 270 };
    writeDanneBossCheckpoint(progress, "cloud", 68);
    expect(readDanneBossCheckpoint(JSON.parse(JSON.stringify(progress)), 180, false))
      .toEqual({ phase: "cloud", hp: 68 });
    expect(progress.statutoryClockTenths).toBe(270);
  });
  it("gives legacy phase-only saves full health and bounds malformed HP", () => {
    expect(readDanneBossCheckpoint({ blackVaultBossPhase: 2 }, 180, false)).toEqual({ phase: "swarm", hp: 180 });
    for (const hp of [-10, 0, 999]) {
      expect(readDanneBossCheckpoint({ blackVaultBossPhase: 1, blackVaultBossHp: hp }, 180, false)?.hp)
        .toBe(hp > 180 ? 180 : 1);
    }
  });
  it("does not resume completed, invalid, or unearned secret phases", () => {
    for (const phase of [0, -1, 1.5, 5, 99]) {
      expect(readDanneBossCheckpoint({ blackVaultBossPhase: phase }, 180, true)).toBeNull();
    }
    expect(readDanneBossCheckpoint({ blackVaultBossPhase: 4 }, 180, false)).toBeNull();
    expect(readDanneBossCheckpoint({ blackVaultBossPhase: 4 }, 180, true)?.phase).toBe("ascendant");
    expect(readDanneBossCheckpoint({ blackVaultBossPhase: 3, blackVaultBossCleared: 1 }, 180, true)).toBeNull();
    expect(readDanneBossCheckpoint({ blackVaultBossPhase: 3, danneBadEnding: 1 }, 180, true)).toBeNull();
  });
});
