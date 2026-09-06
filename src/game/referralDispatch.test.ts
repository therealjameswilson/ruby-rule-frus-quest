import { describe, expect, it } from "vitest";
import { buildDispatchStackLayers, dispatchAisleOpen, dispatchCopyFound, DISPATCH_STACKS, dispatchObjective, nearbyDispatchTarget } from "./referralDispatch";
import { createGameSaveData, gameState, resetGameState, restoreGameSaveData } from "./state";
import { buildReferralR1TileLayers, isReferralR1ExitCell } from "./referralR1Tilemap";
import { canTraverseExit } from "./questArchitecture";
import { FRUS_ROOM_GRAPH } from "./constants";
import { pixelFontMetrics } from "../systems/pixelFontMetrics";

describe("Dispatch Stacks evidence trip", () => {
  it("provides a tool-gated outward path and an unconditional return in the room graph", () => {
    expect(FRUS_ROOM_GRAPH.find(room => room.id === "R1")?.exits.north).toBe("R3");
    expect(FRUS_ROOM_GRAPH.find(room => room.id === "R3")?.exits.south).toBe("R1");
    expect(canTraverseExit("R1", "north", new Set())).toBe(false);
    expect(canTraverseExit("R1", "north", new Set(["clearance_token"]))).toBe(true);
    expect(canTraverseExit("R3", "south", new Set())).toBe(true);
    for (const x of [7, 8]) {
      expect(isReferralR1ExitCell(x, 0)).toBe(true);
      expect(buildReferralR1TileLayers().collisionCells).not.toContainEqual({ tileX: x, tileY: 0 });
    }
  });

  it("has continuous floors, matching solids, two generous side aisles and a two-tile return", () => {
    for (const open of [false, true]) {
      const { ground, walls, collisionCells } = buildDispatchStackLayers(open);
      expect(ground).toHaveLength(12);
      expect(ground.every(row => row.length === 16)).toBe(true);
      expect(new Set(ground.flat()).size).toBe(4);
      for (let y = 0; y < 12; y++) for (let x = 0; x < 16; x++) {
        expect(collisionCells.some(cell => cell.tileX === x && cell.tileY === y)).toBe(walls[y][x] > 0);
      }
      for (let y = 1; y < 11; y++) {
        for (const x of [1, 2, 3, 12, 13, 14]) expect(walls[y][x]).toBe(-1);
      }
      for (let y = 4; y <= 7; y++) for (const x of [7, 8]) expect(walls[y][x] > 0).toBe(!open);
      expect(walls[11][7]).toBe(-1);
      expect(walls[11][8]).toBe(-1);
    }
  });

  it("does not allow reaching the copy or crank through shelves", () => {
    expect(nearbyDispatchTarget({ x: 128, y: 168 })).toBeNull();
    expect(nearbyDispatchTarget({ x: 176, y: 97 })).toBeNull();
    expect(nearbyDispatchTarget({ x: 128, y: 84 })).toBe("receipt");
    expect(nearbyDispatchTarget({ x: 176, y: 84 })).toBe("crank");
    expect(nearbyDispatchTarget({ x: 48, y: 194 })).toBe("index");
  });

  it("saves discoveries and the draft independently without granting approval or rewards", () => {
    resetGameState();
    gameState.sceneProgress.referralManifestDraftRoutes = 13;
    gameState.sceneProgress.referralManifestCarried = 1;
    gameState.sceneProgress.referralDispatchCopyFound = 1;
    gameState.sceneProgress.referralDispatchAisleOpen = 1;
    const before = createGameSaveData();
    restoreGameSaveData(before);
    expect(dispatchCopyFound(gameState.sceneProgress)).toBe(true);
    expect(dispatchAisleOpen(gameState.sceneProgress)).toBe(true);
    expect(gameState.sceneProgress.referralManifestDraftRoutes).toBe(13);
    expect(gameState.sceneProgress.referralManifestReviewComplete).toBeUndefined();
    expect(gameState.documentCandidates).toEqual(before.state.documentCandidates);
    expect(gameState.documentPoints).toBe(before.state.documentPoints);
    expect(gameState.inventory).toEqual(before.state.inventory);
    expect(gameState.processStamps).toEqual(before.state.processStamps);
    resetGameState();
  });

  it("does not invent discoveries for older completed saves", () => {
    const legacy = { referralManifestReviewComplete: 1, referralGateOpen: 1 };
    expect(dispatchCopyFound(legacy)).toBe(false);
    expect(dispatchAisleOpen(legacy)).toBe(false);
  });

  it("fits evidence and objectives at native bitmap size", () => {
    for (const text of [DISPATCH_STACKS.evidence, dispatchObjective({}), dispatchObjective({ referralDispatchCopyFound: 1 }),
      dispatchObjective({ referralDispatchCopyFound: 1, referralDispatchAisleOpen: 1 })]) {
      expect(text.length * pixelFontMetrics(8).advance).toBeLessThanOrEqual(216);
    }
  });
});
