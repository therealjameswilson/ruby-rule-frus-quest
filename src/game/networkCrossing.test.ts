import { describe, expect, it } from "vitest";
import {
  NETWORK_CROSSING, NETWORK_DIVIDERS, networkCrossingState, networkCrossingWaypoint,
  safeNetworkCrossingSpawn, tryOpenNetworkCrossing
} from "./networkCrossing";
import { buildNetworkN1TileLayers, networkN1CollisionRect } from "./networkN1Tilemap";
import { createGameSaveData, gameState, resetGameState, restoreGameSaveData } from "./state";

describe("Network service crossing", () => {
  it("requires the public packet before the owned Citation Stamp can break the seal", () => {
    expect(networkCrossingState({})).toBe("sealed");
    expect(tryOpenNetworkCrossing({}, "citation_stamp", true)).toEqual({ opened: false, message: "File the public packet at OpenNet first." });
    const ready = { networkRoutingStep: 1 };
    expect(networkCrossingState(ready)).toBe("ready");
    expect(tryOpenNetworkCrossing(ready, "red_pencil", true).opened).toBe(false);
    expect(tryOpenNetworkCrossing(ready, "citation_stamp", false).opened).toBe(false);
    expect(tryOpenNetworkCrossing(ready, "citation_stamp", true).opened).toBe(true);
    expect(ready).toEqual({ networkRoutingStep: 1 });
  });

  it("keeps completed old routes open without pretending the shortcut was discovered", () => {
    expect(networkCrossingState({ networkRoutingComplete: 1 })).toBe("open");
    expect(networkCrossingState({ networkStampCrossingOpen: 1 })).toBe("open");
    expect(tryOpenNetworkCrossing({ networkStampCrossingOpen: 1 }, "citation_stamp", true).opened).toBe(false);
  });

  it("round-trips only the shortcut flag through the existing save state", () => {
    resetGameState();
    gameState.sceneProgress.networkRoutingStep = 1;
    gameState.sceneProgress.networkRoutingCarried = 2;
    gameState.sceneProgress.networkStampCrossingOpen = 1;
    const before = createGameSaveData();
    restoreGameSaveData(before);
    expect(networkCrossingState(gameState.sceneProgress)).toBe("open");
    expect(gameState.sceneProgress.networkRoutingStep).toBe(1);
    expect(gameState.sceneProgress.networkRoutingCarried).toBe(2);
    expect(gameState.inventory).toEqual(before.state.inventory);
    expect(gameState.documentPoints).toBe(before.state.documentPoints);
    expect(gameState.documentCandidates).toEqual(before.state.documentCandidates);
    expect(gameState.processStamps).toEqual(before.state.processStamps);
    resetGameState();
  });

  it("gives matching walls and collision, a three-tile crossing, and a two-tile bottom route", () => {
    const { collisionCells, walls } = buildNetworkN1TileLayers();
    const collision = new Set(collisionCells.map(cell => `${cell.tileX},${cell.tileY}`));
    for (const x of [7, 8]) {
      for (const y of [1, 2, 3, 7, 8]) {
        expect(collision.has(`${x},${y}`)).toBe(true);
        expect(walls[y][x]).toBeGreaterThan(0);
      }
      for (const y of [4, 5, 6, 9, 10]) expect(collision.has(`${x},${y}`)).toBe(false);
    }
    expect(NETWORK_CROSSING).toEqual({ x: 112, y: 96, width: 32, height: 48 });
    const interiorRects = collisionCells.filter(cell => cell.tileX > 0 && cell.tileX < 15 && cell.tileY > 0 && cell.tileY < 11).map(networkN1CollisionRect);
    expect(interiorRects).toHaveLength(10);
    for (const rect of interiorRects) expect(NETWORK_DIVIDERS.some(divider => rect.x >= divider.x
      && rect.x + rect.width <= divider.x + divider.width && rect.y >= divider.y
      && rect.y + rect.height <= divider.y + divider.height)).toBe(true);
  });

  it("relocates only old spawn positions that overlap the new solids", () => {
    expect(safeNetworkCrossingSpawn({ x: 128, y: 80 }, true)).toEqual({ x: 104, y: 80 });
    expect(safeNetworkCrossingSpawn({ x: 140, y: 160 }, true)).toEqual({ x: 152, y: 160 });
    expect(safeNetworkCrossingSpawn({ x: 128, y: 124 }, false)).toEqual({ x: 104, y: 124 });
    expect(safeNetworkCrossingSpawn({ x: 106, y: 120 }, false)).toEqual({ x: 104, y: 120 });
    expect(safeNetworkCrossingSpawn({ x: 128, y: 44 }, true)).toEqual({ x: 104, y: 44 });
    for (const position of [{ x: 60, y: 124 }, { x: 128, y: 196 }, { x: 128, y: 124 }]) {
      expect(safeNetworkCrossingSpawn(position, true)).toEqual(position);
    }
  });

  it("guides the closed-gate detour and the earned direct crossing without pointing through walls", () => {
    const classNet = { x: 196, y: 124 };
    expect(networkCrossingWaypoint({ x: 60, y: 124 }, classNet, false)).toEqual({ x: 60, y: 196 });
    expect(networkCrossingWaypoint({ x: 60, y: 196 }, classNet, false)).toEqual({ x: 196, y: 196 });
    expect(networkCrossingWaypoint({ x: 196, y: 196 }, classNet, false)).toEqual(classNet);
    expect(networkCrossingWaypoint({ x: 60, y: 150 }, classNet, true)).toEqual({ x: 60, y: 124 });
    expect(networkCrossingWaypoint({ x: 60, y: 124 }, classNet, true)).toEqual({ x: 160, y: 124 });
    expect(networkCrossingWaypoint({ x: 128, y: 196 }, classNet, true)).toEqual({ x: 196, y: 196 });
  });
});
