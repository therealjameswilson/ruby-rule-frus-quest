import { beforeEach, describe, expect, it, vi } from "vitest";
import { NetworkScene } from "./NetworkScene";
import { gameState, resetGameState } from "../game/state";

vi.mock("phaser", () => ({ default: { Scene: class {}, GameObjects: { Sprite: class {} },
  Math: { Distance: { Between: (x: number, y: number, a: number, b: number) => Math.hypot(x - a, y - b) } }
} }));

beforeEach(() => resetGameState());

describe("network primary interaction priority", () => {
  function fixture(carried: boolean, x = 96, y = 140) {
    const scene = Object.create(NetworkScene.prototype) as NetworkScene;
    Object.assign(scene, {
      currentRoomId: "N1", player: { position: { x, y } },
      routingCarriedPacket: () => carried ? {} : null,
      routingActionHint: () => ({ x: 60, y: 124, radius: 44 })
    });
    return scene as unknown as { atStampCrossing(): boolean };
  }

  it.each([0, 1])("does not steal terminal delivery when routing step is %s", step => {
    gameState.sceneProgress.networkRoutingStep = step;
    expect(fixture(true).atStampCrossing()).toBe(false);
  });

  it("keeps crossing guidance when no packet is held or the terminal is out of reach", () => {
    expect(fixture(false).atStampCrossing()).toBe(true);
    expect(fixture(true, 110, 124).atStampCrossing()).toBe(true);
  });
});
