import { beforeEach, describe, expect, it, vi } from "vitest";
import { DANNE_LURKER_RELIABILITY_DAMAGE } from "../game/danneLurkerBalance";
import { takeDanneLurkerHit } from "./dannePressure";
import { adjustReliability } from "./reliability";

vi.mock("./reliability", () => ({ adjustReliability: vi.fn() }));

describe("DANN-E recovery protection", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each(["contact", "ego_bolt"] as const)("does not debit reliability when %s is rejected by player i-frames", (kind) => {
    const player = { takeHit: vi.fn(() => false) };
    expect(takeDanneLurkerHit(player, { x: 10, y: 20 }, kind, "test")).toBe(false);
    expect(adjustReliability).not.toHaveBeenCalled();
  });

  it.each(["contact", "ego_bolt"] as const)("debits the correct amount for one accepted %s hit", (kind) => {
    const player = { takeHit: vi.fn().mockReturnValueOnce(true).mockReturnValue(false) };
    expect(takeDanneLurkerHit(player, { x: 10, y: 20 }, kind, "test")).toBe(true);
    expect(takeDanneLurkerHit(player, { x: 10, y: 20 }, kind, "test")).toBe(false);
    expect(adjustReliability).toHaveBeenCalledExactlyOnceWith(-DANNE_LURKER_RELIABILITY_DAMAGE[kind], "test");
  });
});
