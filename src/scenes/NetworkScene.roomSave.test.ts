import { describe, expect, it, vi } from "vitest";
import { NetworkScene } from "./NetworkScene";
import { transitionArchiveRoom } from "../systems/sceneTransitions";
import { saveGameNow } from "../systems/save";

vi.mock("phaser", () => ({ default: { Scene: class {}, GameObjects: { Sprite: class {} } } }));
vi.mock("../systems/sceneTransitions", () => ({ transitionArchiveRoom: vi.fn() }));
vi.mock("../systems/save", () => ({ saveGameNow: vi.fn() }));

describe("network room autosave", () => {
  it("saves the destination only after its spawn is applied and controls unlock", () => {
    const scene = new NetworkScene();
    const spawn = vi.fn();
    Object.assign(scene, {
      time: { now: 100 }, player: { setPosition: spawn },
      danneLurker: { enterRoom: vi.fn() }, clearRoom: vi.fn(),
      renderCurrentRoom: vi.fn(), syncRoomTraversalState: vi.fn()
    });
    const internals = scene as unknown as { enterRoom(id: string, spawn: { x: number; y: number }): void; currentRoomId: string; roomTransitionLocked: boolean };
    internals.enterRoom("N2", { x: 28, y: 120 });
    const transition = vi.mocked(transitionArchiveRoom).mock.calls[0][1];
    expect(saveGameNow).not.toHaveBeenCalled();
    transition.onCovered();
    expect(internals.currentRoomId).toBe("N2");
    expect(spawn).toHaveBeenCalledWith(28, 120);
    expect(saveGameNow).not.toHaveBeenCalled();
    transition.onComplete?.();
    expect(internals.roomTransitionLocked).toBe(false);
    expect(saveGameNow).toHaveBeenCalledExactlyOnceWith("scene");
  });
});
