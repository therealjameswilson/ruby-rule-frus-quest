import { describe, expect, it } from "vitest";
import {
  canOpenBossDoor,
  canOpenLockedDoor,
  createInitialDungeonState,
  dungeonComplete,
  earnSmallKey,
  useSmallKey
} from "./dungeonKeys";
import type { DungeonState } from "./dungeonKeys";

describe("dungeon key state", () => {
  it("earns and spends small keys for locked-door gating", () => {
    const empty = createInitialDungeonState("archive_cavern");
    expect(empty.smallKeys).toBe(0);
    expect(canOpenLockedDoor(empty)).toBe(false);

    const earned = earnSmallKey(empty);
    expect(earned.smallKeys).toBe(1);
    expect(earned.mapRevealed).toBe(true);
    expect(canOpenLockedDoor(earned)).toBe(true);

    const spent = useSmallKey(earned);
    expect(spent.smallKeys).toBe(0);
    expect(canOpenLockedDoor(spent)).toBe(false);
    expect(useSmallKey(spent)).toEqual(spent);
  });

  it("opens boss doors only when the big key is held", () => {
    const noBigKey = createInitialDungeonState("two_networks");
    const withBigKey: DungeonState = {
      ...noBigKey,
      bigKeyHeld: true
    };

    expect(canOpenBossDoor(noBigKey)).toBe(false);
    expect(canOpenBossDoor(withBigKey)).toBe(true);
  });

  it("marks dungeon completion from bossDefeated", () => {
    const active = createInitialDungeonState("referral_vault");
    const complete: DungeonState = {
      ...active,
      bossDefeated: true
    };

    expect(dungeonComplete(active)).toBe(false);
    expect(dungeonComplete(complete)).toBe(true);
  });
});
