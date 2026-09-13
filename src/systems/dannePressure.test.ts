import { beforeEach, describe, expect, it, vi } from "vitest";
import { DANNE_LURKER_RELIABILITY_DAMAGE } from "../game/danneLurkerBalance";
import { recoverDanneBossPressure, recoverDanneLurkerPressure, takeDanneBossHit, takeDanneLurkerHit } from "./dannePressure";
import { adjustReliability } from "./reliability";
import { createGameSaveData, gameState, resetGameState, restoreGameSaveData, setSceneState } from "../game/state";
import { DANNE_BOSS_DAMAGE, DANNE_BOSS_RECOVERY_MS } from "../game/danneBossCombat";

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

describe("recoverable final-review pressure", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetGameState();
    gameState.reliability = 100;
    vi.mocked(adjustReliability).mockImplementation((amount) => {
      gameState.reliability = Math.max(0, Math.min(100, gameState.reliability + amount));
    });
  });

  it.each(["ego_bolt", "swarm"] as const)("debits %s only when the player accepts the hit", (kind) => {
    const player = { takeHit: vi.fn().mockReturnValueOnce(true).mockReturnValue(false) };
    expect(takeDanneBossHit(player, { x: 10, y: 20 }, kind)).toBe(true);
    expect(takeDanneBossHit(player, { x: 10, y: 20 }, kind)).toBe(false);
    expect(player.takeHit).toHaveBeenCalledWith({ x: 10, y: 20 }, kind === "ego_bolt" ? 12 : 9, DANNE_BOSS_RECOVERY_MS);
    expect(gameState.reliability).toBe(100 - DANNE_BOSS_DAMAGE[kind]);
    expect(gameState.sceneProgress.blackVaultCombatDamage).toBe(DANNE_BOSS_DAMAGE[kind]);
  });

  it("returns recover actual lurker damage only, without farming or cancelling other losses", () => {
    takeDanneLurkerHit({ takeHit: () => true }, { x: 0, y: 0 }, "ego_bolt", "test");
    gameState.reliability -= 10;
    expect(recoverDanneLurkerPressure()).toBe(2);
    expect(gameState.reliability).toBe(90);
    expect(recoverDanneLurkerPressure()).toBe(0);
    expect(gameState.reliability).toBe(90);
  });

  it("recovers at most one bolt hit at a time and preserves debt through saves", () => {
    setSceneState("ReferralVaultScene", "explore", "Review");
    for (let i = 0; i < 3; i++) takeDanneLurkerHit({ takeHit: () => true }, { x: 0, y: 0 }, "ego_bolt", "test");
    const saved = createGameSaveData(); resetGameState(); restoreGameSaveData(saved);
    expect(recoverDanneLurkerPressure()).toBe(2);
    expect(gameState.sceneProgress.danneRecoverablePressure).toBe(4);
    expect(gameState.documentCandidates).toEqual(saved.state.documentCandidates);
    expect(gameState.inventory).toEqual(saved.state.inventory);
  });

  it("does not count rejected hits or damage beyond zero as recoverable", () => {
    gameState.reliability = 1;
    takeDanneLurkerHit({ takeHit: () => false }, { x: 0, y: 0 }, "ego_bolt", "test");
    expect(recoverDanneLurkerPressure()).toBe(0);
    takeDanneLurkerHit({ takeHit: () => true }, { x: 0, y: 0 }, "ego_bolt", "test");
    expect(recoverDanneLurkerPressure()).toBe(1);
    expect(recoverDanneLurkerPressure()).toBe(0);
  });

  it("restores only combat damage, not a separate standards penalty, and only once", () => {
    takeDanneBossHit({ takeHit: () => true }, { x: 0, y: 0 }, "ego_bolt");
    gameState.reliability -= 5;
    expect(recoverDanneBossPressure()).toBe(10);
    expect(gameState.reliability).toBe(95);
    expect(recoverDanneBossPressure()).toBe(0);
    expect(gameState.reliability).toBe(95);
  });

  it("records actual loss at zero, not an inflated reward", () => {
    gameState.reliability = 3;
    takeDanneBossHit({ takeHit: () => true }, { x: 0, y: 0 }, "ego_bolt");
    expect(gameState.reliability).toBe(0);
    expect(recoverDanneBossPressure()).toBe(3);
    expect(gameState.reliability).toBe(3);
  });

  it("survives the existing save round trip without changing documents or inventory", () => {
    setSceneState("BlackVaultLairScene", "explore", "DANN-E final review");
    takeDanneBossHit({ takeHit: () => true }, { x: 0, y: 0 }, "ego_bolt");
    const saved = createGameSaveData();
    resetGameState();
    restoreGameSaveData(saved);
    expect(gameState.reliability).toBe(90);
    expect(recoverDanneBossPressure()).toBe(10);
    expect(gameState.reliability).toBe(100);
    expect(gameState.documentCandidates).toEqual(saved.state.documentCandidates);
    expect(gameState.inventory).toEqual(saved.state.inventory);
  });
});
