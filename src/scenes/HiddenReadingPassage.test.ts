import { beforeEach, describe, expect, it, vi } from "vitest";
import { NaraStacksScene } from "./NaraStacksScene";
import { HiddenReadingRoomScene } from "./HiddenReadingRoomScene";
import { UIScene } from "./UIScene";
import { DANNE_SCENE_GEOMETRY } from "../game/danneSceneCollisions";
import type { DanneSceneInteractionDefinition } from "../game/danneSceneCollisions";
import { addProcessItem, gameState, resetGameState, setSceneState } from "../game/state";
import { HIDDEN_FIRST_EDITION_LABEL, hiddenReadingRoomDiscovered } from "../game/secretReadingRoom";
import { buildWeaponHitbox } from "../systems/weaponState";
import { saveGameNow } from "../systems/save";
import { transitionTo } from "../systems/sceneTransitions";
import type { Interactable } from "../game/types";

vi.mock("phaser", () => ({ default: { Scene: class {}, GameObjects: { Sprite: class {} }, Geom: {
  Rectangle: class { constructor(public x: number, public y: number, public width: number, public height: number) {} }
} } }));
vi.mock("../entities/Player", () => ({ Player: class {} }));
vi.mock("../systems/save", () => ({ saveGameNow: vi.fn() }));
vi.mock("../systems/sceneTransitions", () => ({ transitionTo: vi.fn() }));
vi.mock("../systems/audio", () => ({ retroAudio: { warning: vi.fn(), toolHit: vi.fn(), danneItemPickup: vi.fn() } }));

describe("safe reading room guidance", () => {
  it("points to the book then the exit, never to a nonfunctional tool action", () => {
    resetGameState();
    setSceneState("HiddenReadingRoomScene", "explore", "CLAIM FIRST EDITION");
    const ui = new UIScene() as unknown as { compactActionLine(tool: string): string };
    expect(ui.compactActionLine("FOLDER")).toBe("BOOK: CENTER AISLE");
    gameState.inventory.push(HIDDEN_FIRST_EDITION_LABEL);
    expect(ui.compactActionLine("FOLDER")).toBe("EXIT: SOUTH DOOR");
    gameState.nearestInteractable = "Return to NARA Stacks";
    expect(ui.compactActionLine("FOLDER")).toContain("INTERACT:");
  });
});

interface PassageScene {
  time: { now: number };
  player: {
    position: { x: number; y: number };
    faceTowards: ReturnType<typeof vi.fn>;
    startAction: ReturnType<typeof vi.fn>;
    combatReadout: { weapon: { canSwing: boolean; tool: "review_folder" } };
    activeActionHitbox: ReturnType<typeof buildWeaponHitbox> | null;
  };
  interactables: Interactable[];
  cacheToast: { show: ReturnType<typeof vi.fn> };
  drawHiddenPassageSeam: ReturnType<typeof vi.fn>;
  handleInteraction(definition: DanneSceneInteractionDefinition): void;
  resolveReadingPassage(): void;
  enterReadingPassage(): void;
}

const definition = DANNE_SCENE_GEOMETRY.NaraStacksScene.interactions.find((item) => item.action === "hidden-reading-room-passage")!;

function passageScene(): PassageScene {
  setSceneState("NaraStacksScene", "explore", "Explore");
  return Object.assign(new NaraStacksScene(), {
    time: { now: 1000 }, cacheToast: { show: vi.fn() }, drawHiddenPassageSeam: vi.fn(),
    interactables: [{ ...definition, kind: "document", onInteract: vi.fn() }],
    player: { position: { x: 204, y: 88 }, faceTowards: vi.fn(), startAction: vi.fn(() => true),
      combatReadout: { weapon: { canSwing: true, tool: "review_folder" } }, activeActionHitbox: null }
  }) as unknown as PassageScene;
}

beforeEach(() => { resetGameState(); vi.clearAllMocks(); });

describe("live reading passage handlers", () => {
  it("rejects unowned ordinary expansion-map swings but permits an earned Folder", () => {
    const startAction = vi.fn(() => true);
    const scene = Object.assign(new NaraStacksScene(), {
      player: { position: { x: 128, y: 150 }, startAction, combatReadout: { state: "idle" } },
      cacheToast: { show: vi.fn() }
    }) as unknown as { useDanneItemAction(): void; cacheToast: { show: ReturnType<typeof vi.fn> } };
    for (const tool of [null, "clearance_token", "review_folder"] as const) {
      gameState.equippedProcessItem = tool;
      scene.useDanneItemAction();
      expect(startAction).not.toHaveBeenCalled();
    }
    expect(scene.cacheToast.show).toHaveBeenCalledTimes(3);
    addProcessItem("review_folder");
    gameState.equippedProcessItem = "review_folder";
    scene.useDanneItemAction();
    expect(startAction).toHaveBeenCalledExactlyOnceWith("review_folder");
  });

  it("gives a short missing-tool hint without opening or transitioning", () => {
    const scene = passageScene();
    scene.handleInteraction(definition);
    expect(scene.cacheToast.show).toHaveBeenCalledWith("NEEDS REVIEW FOLDER", scene.player.position, "info");
    expect(scene.player.startAction).not.toHaveBeenCalled();
    expect(hiddenReadingRoomDiscovered(gameState)).toBe(false);
    expect(transitionTo).not.toHaveBeenCalled();
  });

  it("A auto-equips/faces, but waits for active contact and a separate entry", () => {
    addProcessItem("review_folder");
    const scene = passageScene();
    scene.handleInteraction(definition);
    expect(gameState.equippedProcessItem).toBe("review_folder");
    expect(scene.player.faceTowards).toHaveBeenCalledWith(definition);
    expect(scene.player.startAction).toHaveBeenCalledWith("review_folder");
    scene.resolveReadingPassage();
    expect(hiddenReadingRoomDiscovered(gameState)).toBe(false);
    const points = gameState.documentPoints;
    scene.player.activeActionHitbox = buildWeaponHitbox(scene.player.position, "north", "review_folder");
    scene.resolveReadingPassage();
    scene.resolveReadingPassage();
    expect(hiddenReadingRoomDiscovered(gameState)).toBe(true);
    expect(scene.drawHiddenPassageSeam).toHaveBeenCalledOnce();
    expect(scene.interactables[0]).toMatchObject({ label: "Reading Room", kind: "door" });
    expect(gameState.documentPoints).toBe(points);
    expect(saveGameNow).toHaveBeenCalledOnce();
    scene.enterReadingPassage();
    expect(transitionTo).not.toHaveBeenCalled();
    scene.time.now = 1400;
    scene.enterReadingPassage();
    scene.enterReadingPassage();
    expect(transitionTo).toHaveBeenCalledExactlyOnceWith(scene, "HiddenReadingRoomScene", { chapterFrom: "DN1", chapterTo: "DN2" });
  });

  it("keeps an already discovered entrance usable without consuming another tool", () => {
    const scene = passageScene();
    gameState.sceneProgress.hiddenReadingRoomDiscovered = 1;
    scene.handleInteraction(definition);
    expect(scene.player.startAction).not.toHaveBeenCalled();
    expect(transitionTo).toHaveBeenCalledOnce();
  });
});

describe("first edition and matching return door", () => {
  function readingRoom() {
    return Object.assign(new HiddenReadingRoomScene(), {
      time: { now: 1000 }, player: { position: { x: 128, y: 150 } },
      toast: { show: vi.fn() }, prompt: { update: vi.fn() }, interactables: [
        { id: "first-edition-frus", label: "First Edition FRUS", x: 128, y: 132, radius: 28, kind: "document", onInteract: vi.fn() },
        { id: "reading-room-return", label: "Return to NARA Stacks", x: 128, y: 224, radius: 26, kind: "door", onInteract: vi.fn() }
      ]
    }) as unknown as { collectFirstEdition(): void; returnToStacks(): void; toast: { show: ReturnType<typeof vi.fn> };
      interactables: Interactable[]; prompt: { update: ReturnType<typeof vi.fn> } };
  }

  it("awards once, points south, and does not open a blocking dialogue", () => {
    const scene = readingRoom();
    scene.collectFirstEdition();
    scene.collectFirstEdition();
    expect(gameState.documentPoints).toBe(25);
    expect(gameState.inventory.filter((item) => item === HIDDEN_FIRST_EDITION_LABEL)).toHaveLength(1);
    expect(gameState.activeDialog).toBeNull();
    expect(gameState.objective).toBe("SOUTH TO STACKS");
    expect(saveGameNow).toHaveBeenCalledOnce();
    expect(scene.toast.show).toHaveBeenCalledTimes(2);
    expect(scene.interactables.map((item) => item.id)).toEqual(["reading-room-return"]);
    expect(scene.prompt.update).toHaveBeenCalledWith(0, null);
    expect(gameState.nearestInteractable).toBeNull();
  });

  it("returns to the same shelf once, not to the archive front entrance", () => {
    const scene = readingRoom();
    scene.returnToStacks();
    scene.returnToStacks();
    expect(transitionTo).toHaveBeenCalledExactlyOnceWith(scene, "NaraStacksScene", { chapterFrom: "DN2", chapterTo: "DN1" });
    expect(saveGameNow).toHaveBeenCalledOnce();
  });

  it("holds the book visibly without delaying the save or duplicating the reveal", () => {
    const collectible = { y: 126, setDepth: vi.fn().mockReturnThis(), setName: vi.fn().mockReturnThis(),
      setY: vi.fn(), destroy: vi.fn() };
    const tweens = { add: vi.fn() };
    const scene = Object.assign(readingRoom(), { collectible, tweens });
    scene.collectFirstEdition();
    scene.collectFirstEdition();
    expect(collectible.setName).toHaveBeenCalledExactlyOnceWith("first-edition-reveal");
    expect(tweens.add).toHaveBeenCalledTimes(2);
    expect(tweens.add.mock.calls[0][0]).toMatchObject({ targets: collectible, y: 88, duration: 240 });
    expect(tweens.add.mock.calls[1][0]).toMatchObject({ targets: collectible, alpha: 0, delay: 1140, duration: 400 });
    expect(saveGameNow).toHaveBeenCalledOnce();
    expect(gameState.activeDialog).toBeNull();
    collectible.y = 88.4;
    tweens.add.mock.calls[0][0].onUpdate();
    expect(collectible.setY).toHaveBeenCalledWith(88);
    tweens.add.mock.calls[1][0].onComplete();
    expect(collectible.destroy).toHaveBeenCalledOnce();
  });
});
