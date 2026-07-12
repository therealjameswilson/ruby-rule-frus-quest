import { describe, expect, it } from "vitest";
import {
  DANNE_LURKER_BOLT_COOLDOWN_MS,
  DANNE_LURKER_BOLT_TELEGRAPH_MS,
  DANNE_LURKER_RELIABILITY_DAMAGE,
  danneLurkerTelegraphRemainingMs
} from "./danneLurkerBalance";

describe("DANN-E lurker balance", () => {
  it("gives players a readable warning and recovery window", () => {
    expect(DANNE_LURKER_BOLT_TELEGRAPH_MS).toBeGreaterThanOrEqual(600);
    expect(DANNE_LURKER_BOLT_COOLDOWN_MS).toBeGreaterThan(DANNE_LURKER_BOLT_TELEGRAPH_MS * 4);
  });

  it("keeps ambient pressure below a standards violation", () => {
    expect(DANNE_LURKER_RELIABILITY_DAMAGE.contact).toBe(1);
    expect(DANNE_LURKER_RELIABILITY_DAMAGE.ego_bolt).toBe(2);
  });

  it("reports a clamped telegraph countdown", () => {
    expect(danneLurkerTelegraphRemainingMs(1700, 1200)).toBe(500);
    expect(danneLurkerTelegraphRemainingMs(1700, 1800)).toBe(0);
  });
});
