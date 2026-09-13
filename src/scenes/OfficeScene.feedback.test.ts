import { beforeEach, describe, expect, it, vi } from "vitest";
import { OfficeScene } from "./OfficeScene";
import { gameState, resetGameState } from "../game/state";
import { transitionTo } from "../systems/sceneTransitions";

vi.mock("phaser", () => ({ default: { Scene: class {}, GameObjects: { Sprite: class {} },
  Math: { Clamp: (value: number, min: number, max: number) => Math.max(min, Math.min(max, value)) } } }));
vi.mock("../entities/Player", () => ({ Player: class {} }));
vi.mock("../systems/audio", () => ({ retroAudio: { warning: vi.fn(), blip: vi.fn() } }));
vi.mock("../systems/sceneTransitions", () => ({ transitionTo: vi.fn() }));
vi.mock("../systems/save", () => ({ saveGameNow: vi.fn() }));

interface FeedbackScene {
  player: { position: { x: number; y: number }; setPosition: ReturnType<typeof vi.fn> };
  clearJuniorSpawn(feet: { x: number; y: number; width: number; height: number }): void;
  toast: { show: ReturnType<typeof vi.fn>; showInteractionHint: ReturnType<typeof vi.fn> };
  dialog: { show: ReturnType<typeof vi.fn> };
  handleStarterMemo(): void;
  handleStarterMemoInbox(): void;
  handleArchiveGuideDoor(): void;
  flashNoTargetHint(): void;
  currentInteractables(): { id: string; radius: number }[];
}
function harness() {
  return Object.assign(new OfficeScene(), {
    player: { position: { x: 128, y: 190 }, setPosition: vi.fn() },
    juniorCompiler: { x: 70, y: 122 },
    interactables: [{ id: "archive-guide-door" }, { id: "junior-compiler" }, { id: "starter-memo" }],
    toast: { show: vi.fn(), showInteractionHint: vi.fn() }, dialog: { show: vi.fn() }
  }) as unknown as FeedbackScene;
}
beforeEach(() => { resetGameState(); gameState.mode = "explore"; vi.clearAllMocks(); });

describe("opening route feedback", () => {
  it("rescues an old overlapping spawn without moving a safe spawn", () => {
    const scene = harness();
    const feet = { x: 64, y: 119, width: 12, height: 8 };
    scene.clearJuniorSpawn(feet);
    expect(scene.player.setPosition).not.toHaveBeenCalled();
    scene.player.position = { x: 70, y: 122 };
    scene.clearJuniorSpawn(feet);
    expect(scene.player.setPosition).toHaveBeenCalledWith(100, 122);
    expect(gameState.sceneProgress.juniorCompilerIntroduced).not.toBe(1);
  });
  it("keeps the first briefing nearby and gives distant players useful guidance", () => {
    const scene = harness();
    expect(scene.currentInteractables().find(target => target.id === "junior-compiler")!.radius).toBe(36);
    scene.flashNoTargetHint();
    expect(scene.toast.showInteractionHint).toHaveBeenCalledWith("TALK TO JR AT WEST DESK", scene.player.position, "info");
    expect(gameState.sceneProgress.juniorCompilerIntroduced).not.toBe(1);
    expect(gameState.mode).toBe("explore");
  });
  it.each([0, 1, 2])("keeps the locked archive door inspectable at memo step %i", status => {
    const scene = harness();
    expect(scene.currentInteractables().some(target => target.id === "archive-guide-door")).toBe(true);
    // Door interactions receive another six pixels of shared reach assistance.
    expect(scene.currentInteractables().find(target => target.id === "archive-guide-door")!.radius + 6).toBeLessThan(20);
    gameState.sceneProgress.juniorCompilerIntroduced = 1;
    gameState.sceneProgress.officeStarterMemoStatus = status;
    expect(scene.currentInteractables().some(target => target.id === "archive-guide-door")).toBe(true);
  });
  it.each(["handleStarterMemo", "handleStarterMemoInbox", "handleArchiveGuideDoor"] as const)(
    "%s guides an unbriefed player without opening a dialog", method => {
      const scene = harness(); scene[method]();
      expect(scene.toast.show).toHaveBeenCalledWith("TALK TO JR AT WEST DESK", scene.player.position, "info");
      expect(scene.dialog.show).not.toHaveBeenCalled();
      expect(gameState.mode).toBe("explore");
      expect(transitionTo).not.toHaveBeenCalled();
    });
  it.each([[0, "TAKE THE MEMO FIRST"], [1, "CARRY MEMO TO INBOX"], [2, "STAMP MEMO AT INBOX"]] as const)(
    "keeps the archive locked at memo step %i with an actionable toast", (status, message) => {
      gameState.sceneProgress.juniorCompilerIntroduced = 1;
      gameState.sceneProgress.officeStarterMemoStatus = status;
      const scene = harness(); scene.handleArchiveGuideDoor();
      expect(scene.toast.show).toHaveBeenCalledWith(message, scene.player.position, "info");
      expect(scene.dialog.show).not.toHaveBeenCalled();
      expect(gameState.sceneProgress.officeStarterMemoStatus).toBe(status);
      expect(gameState.mode).toBe("explore");
      expect(transitionTo).not.toHaveBeenCalled();
    });
  it("leaves the player free to fetch the missing memo from the inbox", () => {
    gameState.sceneProgress.juniorCompilerIntroduced = 1;
    const scene = harness(); scene.handleStarterMemoInbox();
    expect(scene.toast.show).toHaveBeenCalledWith("TAKE THE MEMO FIRST", scene.player.position, "info");
    expect(scene.dialog.show).not.toHaveBeenCalled();
    expect(gameState.mode).toBe("explore");
  });
});
