import { beforeEach, describe, expect, it } from "vitest";
import { createGameSaveData, gameState, getRoomGraphReadout, resetGameState, restoreGameSaveData } from "./state";

beforeEach(() => resetGameState());
const gate = () => getRoomGraphReadout().find(room => room.id === "R1")!.lockedExitState.east;

describe("visible-treatment route", () => {
  it("requires the earned review stamp, not small keys or an unprinted draft", () => {
    gameState.dungeons.referral_vault.smallKeys = 20;
    gameState.sceneProgress.referralTreatmentStep = 2;
    expect(gate().canOpen).toBe(false);
    expect(gate().gateType).toBe("workflow");
    expect(gate().blockedMessage).toContain("stamp the review press");
    gameState.processStamps.push("referral");
    expect(gate().canOpen).toBe(true);
    const save = createGameSaveData();
    resetGameState(); restoreGameSaveData(save);
    expect(gate().canOpen).toBe(true);
    expect(gate().blockedMessage).toBeNull();
  });
});
