import { beforeEach, describe, expect, it, vi } from "vitest";
import { ArchiveScene } from "./ArchiveScene";
import { gameState, resetGameState } from "../game/state";
import type { Interactable } from "../game/types";
import { saveGameNow } from "../systems/save";

vi.mock("phaser", () => ({ default: {
  Scene: class {}, GameObjects: { Sprite: class {} },
  Math: { Clamp: (value: number, min: number, max: number) => Math.max(min, Math.min(max, value)) }
} }));
vi.mock("../systems/snesPixelArt", () => ({ addSnesTreasurePedestal: vi.fn() }));
vi.mock("../systems/audio", () => ({ retroAudio: { confirm: vi.fn() } }));
vi.mock("../systems/save", () => ({ saveGameNow: vi.fn() }));

beforeEach(() => { resetGameState(); vi.clearAllMocks(); });

describe("Archive secret reward flow", () => {
  it.each(["C3", "D2"])("awards %s once without blocking movement on first or repeated collection", (id) => {
    const scene = new ArchiveScene();
    const dialog = { show: vi.fn() }, toast = { show: vi.fn() }, cue = vi.fn();
    const interactables: Interactable[] = [];
    Object.assign(scene, {
      cameras: { main: { setBackgroundColor: vi.fn() } },
      drawRubyVolumeStack: vi.fn(), drawDocumentStack: vi.fn(), drawSparkle: vi.fn(),
      collected: new Set<string>(), interactables, player: { position: { x: 128, y: 160 } },
      dialog, toast, showSecretRewardCue: cue, refreshRoomObjective: vi.fn()
    });
    const internal = scene as unknown as { renderSecretRoom(room: { id: string }): void };
    internal.renderSecretRoom({ id });
    const points = gameState.documentPoints;
    interactables[0].onInteract();
    expect(gameState.documentPoints).toBe(points + (id === "C3" ? 10 : 6));
    if (id === "C3") expect(gameState.volumeFragments).toContain("Hidden Cache Fragment");
    expect(cue).toHaveBeenCalledExactlyOnceWith(id);
    expect(saveGameNow).toHaveBeenCalledOnce();
    expect(dialog.show).not.toHaveBeenCalled();
    expect((scene as unknown as { interactables: Interactable[] }).interactables).toHaveLength(0);
    interactables[0].onInteract();
    expect(gameState.documentPoints).toBe(points + (id === "C3" ? 10 : 6));
    expect(cue).toHaveBeenCalledOnce();
    expect(dialog.show).not.toHaveBeenCalled();
    expect(toast.show).toHaveBeenCalledWith("REWARD ALREADY FILED", expect.any(Object), "info");
  });
});
