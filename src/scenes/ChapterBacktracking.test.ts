import { beforeEach, describe, expect, it, vi } from "vitest";
import { ArchiveScene } from "./ArchiveScene";
import { NetworkScene } from "./NetworkScene";
import { ReferralVaultScene } from "./ReferralVaultScene";
import { SilentReadScene } from "./SilentReadScene";
import { OfficeScene } from "./OfficeScene";
import { addProcessItem, gameState, resetGameState } from "../game/state";
import { transitionTo } from "../systems/sceneTransitions";
import { saveGameNow } from "../systems/save";

vi.mock("phaser", () => ({ default: { Scene: class {}, GameObjects: { Sprite: class {} } } }));
vi.mock("../entities/Player", () => ({ Player: class {} }));
vi.mock("../systems/sceneTransitions", () => ({ transitionTo: vi.fn() }));
vi.mock("../systems/save", () => ({ saveGameNow: vi.fn() }));
vi.mock("../systems/audio", () => ({ retroAudio: { warning: vi.fn(), confirm: vi.fn() } }));

interface DoorScene {
  currentRoomId: string;
  roomTransitionLocked: boolean;
  exitCooldownUntil: number;
  time: { now: number };
  player: { position: { x: number; y: number }; setPosition: ReturnType<typeof vi.fn> };
  toast: { show: ReturnType<typeof vi.fn> };
  routingComplete: boolean;
  referralGateOpen: boolean;
  sourceRoomComplete: ReturnType<typeof vi.fn>;
  referralObjective: ReturnType<typeof vi.fn>;
  checkRoomExit(): boolean;
}

function doorScene(scene: object, roomId: string, x = 14): DoorScene {
  return Object.assign(scene, {
    currentRoomId: roomId, roomTransitionLocked: false, exitCooldownUntil: 0, time: { now: 1000 },
    player: { position: { x, y: 124 }, setPosition: vi.fn() },
    toast: { show: vi.fn() }, routingComplete: false, referralGateOpen: false,
    sourceRoomComplete: vi.fn(() => false), referralObjective: vi.fn(() => "FILE EQUITIES")
  }) as unknown as DoorScene;
}

beforeEach(() => { resetGameState(); vi.clearAllMocks(); });

describe("live cross-chapter exit handlers", () => {
  it("states the goal on first assignment and preserves practical hints on repeat", () => {
    const scene = Object.assign(new OfficeScene(), {
      player: { position: { x: 64, y: 100 } }, toast: { show: vi.fn() },
      updateFirstQuestCue: vi.fn(), officeStarterMemoStatus: () => 0,
      currentOfficeObjective: () => "TAKE THE MEMO"
    }) as unknown as { talkJuniorCompiler(): void; toast: { show: ReturnType<typeof vi.fn> } };
    const points = gameState.documentPoints;
    const inventory = [...gameState.inventory];
    scene.talkJuniorCompiler();
    expect(scene.toast.show).toHaveBeenLastCalledWith("PUBLISH A FRUS VOLUME", { x: 64, y: 100 }, "info");
    expect(gameState.sceneProgress.juniorCompilerIntroduced).toBe(1);
    expect(gameState.latestMessage).toContain("publish a reliable FRUS volume");
    scene.talkJuniorCompiler();
    expect(scene.toast.show).toHaveBeenLastCalledWith("PICK MEMO -> INBOX -> STAMP", { x: 64, y: 100 }, "info");
    expect(gameState.documentPoints).toBe(points);
    expect(gameState.inventory).toEqual(inventory);
  });
  it("retires finished Office tasks without hiding the colleague, door or other desks", () => {
    const scene = new OfficeScene() as unknown as {
      officeStarterMemoStatus(): number;
      interactables: Array<{ id: string; label: string }>;
      currentInteractables(): Array<{ id: string; label: string }>;
    };
    scene.officeStarterMemoStatus = () => 3;
    const ids = ["starter-memo", "production-inbox", "junior-compiler", "archive-guide-door", "scope-charter-desk"];
    scene.interactables = ids.map(id => ({ id, label: id }));
    gameState.sceneProgress.juniorCompilerIntroduced = 1;
    gameState.inventory.push("Master Declass Key");
    const before = structuredClone(gameState);
    expect(scene.currentInteractables().map(target => target.id)).toEqual(ids.slice(2));
    expect(gameState).toEqual(before);
    expect(scene.interactables.map(target => target.id)).toEqual(ids);
  });
  it.each([
    [ArchiveScene, "A1", "OfficeScene", "O1"],
    [NetworkScene, "N1", "ArchiveScene", "A1"],
    [ReferralVaultScene, "R1", "NetworkScene", "N2"],
    [SilentReadScene, "E1", "ReferralVaultScene", "R2"]
  ] as const)("%s returns through %s without clearing progress or awarding anything", (Scene, room, target, to) => {
    const scene = doorScene(new Scene(), room, room === "A1" ? 8 : 14);
    gameState.sceneProgress.networkRoutingCarried = 2;
    gameState.sceneProgress.referralEquityPacketCarried = 2;
    gameState.sceneProgress.silentReadReviewStatus = 3;
    const before = structuredClone(gameState);
    expect(scene.checkRoomExit()).toBe(true);
    expect(scene.roomTransitionLocked).toBe(true);
    expect(saveGameNow).toHaveBeenCalledOnce();
    expect(transitionTo).toHaveBeenCalledExactlyOnceWith(scene, target, { chapterFrom: room, chapterTo: to });
    expect(gameState).toEqual(before);
  });

  it.each([[NetworkScene, "N1"], [ReferralVaultScene, "R1"], [SilentReadScene, "E1"], [SilentReadScene, "S1"]] as const)("keeps %s/%s's unfinished forward gate closed", (Scene, room) => {
    const scene = doorScene(new Scene(), room, 242);
    expect(scene.checkRoomExit()).toBe(false);
    expect(transitionTo).not.toHaveBeenCalled();
    expect(scene.player.setPosition).toHaveBeenCalled();
  });

  it.each([[NetworkScene, "N2", "clearance_token", "ReferralVaultScene", "R1"], [ReferralVaultScene, "R2", "concurrence_slip", "SilentReadScene", "E1"]] as const)("passes an exact doorway on the earned %s/%s forward route", (Scene, room, tool, target, to) => {
    addProcessItem(tool);
    const scene = doorScene(new Scene(), room, 242);
    expect(scene.checkRoomExit()).toBe(true);
    expect(transitionTo).toHaveBeenCalledExactlyOnceWith(scene, target, { chapterFrom: room, chapterTo: to });
  });

  it("bypasses the completed Guide on return but never skips new-player training", () => {
    const scene = new OfficeScene() as unknown as {
      handleArchiveGuideDoor(): void;
      officeStarterMemoStatus(): number;
    };
    scene.officeStarterMemoStatus = () => 3;
    gameState.sceneProgress.juniorCompilerIntroduced = 1;
    gameState.inventory.push("Master Declass Key", "FRUS Fragment: Front Matter");
    scene.handleArchiveGuideDoor();
    expect(transitionTo).toHaveBeenLastCalledWith(scene, "GuideScene");
    gameState.sceneProgress.guideCitationCounterTrained = 1;
    scene.handleArchiveGuideDoor();
    expect(transitionTo).toHaveBeenLastCalledWith(scene, "ArchiveScene", { chapterFrom: "O1", chapterTo: "A1" });
  });
});
