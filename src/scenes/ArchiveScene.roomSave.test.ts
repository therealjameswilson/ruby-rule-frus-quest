import { describe, expect, it, vi } from "vitest";
import { ArchiveScene } from "./ArchiveScene";
import { transitionArchiveRoom } from "../systems/sceneTransitions";
import { saveGameNow } from "../systems/save";
import { gameState, resetGameState, setObjective } from "../game/state";

vi.mock("phaser", () => ({ default: { Scene: class {}, GameObjects: { Sprite: class {} } } }));
vi.mock("../systems/sceneTransitions", () => ({ transitionArchiveRoom: vi.fn() }));
vi.mock("../systems/save", () => ({ saveGameNow: vi.fn() }));

describe("archive room autosave", () => {
  it("keeps the active task when an optional tool gate rejects travel", () => {
    resetGameState();
    setObjective("PICK UP SOURCE NOTE");
    const scene = new ArchiveScene(), show = vi.fn(), enterRoom = vi.fn();
    Object.assign(scene, {
      currentRoomId: "A1", exitCooldownUntil: 0, time: { now: 1000 },
      player: { position: { x: 128, y: 220 }, setPosition: vi.fn() },
      toast: { show }, enterRoom, refreshRoomObjective: vi.fn()
    });
    const internal = scene as unknown as { checkRoomExit(): boolean };
    expect(internal.checkRoomExit()).toBe(false);
    expect(gameState.objective).toBe("PICK UP SOURCE NOTE");
    expect(show).toHaveBeenCalledWith("You need the Concurrence Slip.", { x: 128, y: 220 }, "info");
    expect(enterRoom).not.toHaveBeenCalled();
  });
  it("saves only after the destination and safe spawn have been applied", () => {
    vi.clearAllMocks();
    const scene = new ArchiveScene();
    const spawn = vi.fn();
    Object.assign(scene, {
      time: { now: 100 }, player: { setPosition: spawn },
      danneLurker: { enterRoom: vi.fn() },
      clearRoom: vi.fn(), renderCurrentRoom: vi.fn(),
      syncRoomTraversalState: vi.fn(), updateVisitedMinimap: vi.fn()
    });
    const internals = scene as unknown as { enterRoom(id: string, spawn: { x: number; y: number }): void; currentRoomId: string; roomTransitionLocked: boolean };
    internals.enterRoom("AS", { x: 128, y: 192 });
    const transition = vi.mocked(transitionArchiveRoom).mock.calls[0][1];
    expect(saveGameNow).not.toHaveBeenCalled();
    transition.onCovered();
    expect(internals.currentRoomId).toBe("AS");
    expect(spawn).toHaveBeenCalledWith(128, 192);
    expect(saveGameNow).not.toHaveBeenCalled();
    transition.onComplete?.();
    expect(internals.roomTransitionLocked).toBe(false);
    expect(saveGameNow).toHaveBeenCalledExactlyOnceWith("scene");
  });
});
