import { beforeEach, describe, expect, it, vi } from "vitest";
import { gameState, resetGameState, unresolvedStandardsViolations } from "../game/state";
import { adjustReliability, applyStandardsViolation } from "./reliability";
import { applyDanneLurkerDamage, recoverDanneLurkerPressure } from "./dannePressure";

vi.mock("phaser", () => ({ default: { Math: { Clamp: (n: number, min: number, max: number) => Math.max(min, Math.min(max, n)) } } }));
vi.mock("./audio", () => ({ retroAudio: { confirm: vi.fn(), warning: vi.fn() } }));

beforeEach(() => { resetGameState(); gameState.reliability = 100; });

describe("live lurker recovery accounting", () => {
  it("does not spend the same combat loss twice after quest healing", () => {
    applyDanneLurkerDamage("ego_bolt", "test");
    adjustReliability(5, "quest reward");
    applyStandardsViolation("undisclosed_deletion");
    const before = gameState.reliability;
    expect(recoverDanneLurkerPressure()).toBe(0);
    expect(gameState.reliability).toBe(before);
    expect(unresolvedStandardsViolations()).toHaveLength(1);
  });

  it("repays a partial heal and a counter exactly once each", () => {
    for (let i = 0; i < 3; i++) applyDanneLurkerDamage("ego_bolt", "test");
    adjustReliability(1, "quest reward");
    expect(gameState.sceneProgress.danneRecoverablePressure).toBe(5);
    expect(recoverDanneLurkerPressure()).toBe(2);
    expect(gameState.sceneProgress.danneRecoverablePressure).toBe(3);
    expect(recoverDanneLurkerPressure()).toBe(2);
    expect(recoverDanneLurkerPressure()).toBe(1);
    expect(recoverDanneLurkerPressure()).toBe(0);
    expect(gameState.reliability).toBe(100);
  });

  it("recovers combat loss without resolving a standards violation", () => {
    applyDanneLurkerDamage("ego_bolt", "test");
    applyStandardsViolation("concealed_policy_defect");
    const before = gameState.reliability;
    const ledger = structuredClone(unresolvedStandardsViolations());
    expect(recoverDanneLurkerPressure()).toBe(2);
    expect(gameState.reliability).toBe(before + 2);
    expect(unresolvedStandardsViolations()).toEqual(ledger);
  });
});
