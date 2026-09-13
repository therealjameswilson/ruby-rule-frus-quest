import { beforeEach, describe, expect, it } from "vitest";
import { carriedClassNetVaultDocket } from "./classNetVaultReview";
import { createGameSaveData, gameState, getRoomGraphReadout, resetGameState, restoreGameSaveData } from "./state";

beforeEach(() => resetGameState());
const gates = () => getRoomGraphReadout().find(room => room.id === "N2")!.lockedExitState;

describe("vault review return restriction", () => {
  it("only restricts west while a real docket is carried and names its destination", () => {
    expect(gates().west).toBeUndefined();
    for (const order of [1, 2, 3]) {
      gameState.sceneProgress.classNetVaultDocketCarried = order;
      const docket = carriedClassNetVaultDocket(gameState.sceneProgress)!;
      expect(gates().west.canOpen).toBe(false);
      expect(gates().west.gateType).toBe("workflow");
      expect(gates().west.blockedMessage).toContain(docket.stationLabel);
      expect(gates().east.canOpen).toBe(false);
    }
    for (const order of [0, -1, 4, Number.NaN]) {
      gameState.sceneProgress.classNetVaultDocketCarried = order;
      expect(carriedClassNetVaultDocket(gameState.sceneProgress)).toBeNull();
      expect(gates().west).toBeUndefined();
    }
  });

  it("preserves the carried restriction through saving and removes it after filing", () => {
    gameState.sceneProgress.classNetVaultReviewStep = 1;
    gameState.sceneProgress.classNetVaultDocketCarried = 2;
    const save = createGameSaveData();
    resetGameState(); restoreGameSaveData(save);
    expect(gates().west.canOpen).toBe(false);
    gameState.sceneProgress.classNetVaultDocketCarried = 0;
    expect(gates().west).toBeUndefined();
  });
});
