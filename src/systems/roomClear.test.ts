import { beforeEach, describe, expect, it } from "vitest";
import type { DanneEnemy } from "../entities/DanneEnemy";
import { gameState, resetGameState } from "../game/state";
import { applyRoomClearGate, isRoomCleared, roomClearFlag, roomClearStatus } from "./roomClear";

function enemy(defeated: boolean) {
  return { defeated } as DanneEnemy;
}

describe("roomClear", () => {
  beforeEach(() => {
    resetGameState();
  });

  it("tracks defeated enemies before a room is cleared", () => {
    const status = roomClearStatus("black_vault", [enemy(true), enemy(false)], ["blackVaultWestOpen"]);
    expect(status).toMatchObject({
      roomId: "black_vault",
      defeatedEnemyCount: 1,
      requiredEnemyCount: 2,
      cleared: false
    });
    expect(isRoomCleared("black_vault")).toBe(false);
  });

  it("opens configured flags only when every enemy is defeated", () => {
    applyRoomClearGate("black_vault", [enemy(true), enemy(false)], ["blackVaultWestOpen"], "locked");
    expect(gameState.sceneProgress.blackVaultWestOpen).toBeUndefined();

    const status = applyRoomClearGate("black_vault", [enemy(true), enemy(true)], ["blackVaultWestOpen"], "open");
    expect(status.cleared).toBe(true);
    expect(gameState.sceneProgress[roomClearFlag("black_vault")]).toBe(1);
    expect(gameState.sceneProgress.blackVaultWestOpen).toBe(1);
  });
});
