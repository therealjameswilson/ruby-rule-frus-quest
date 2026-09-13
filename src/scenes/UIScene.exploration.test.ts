import { beforeEach, describe, expect, it, vi } from "vitest";
import { UIScene } from "./UIScene";
import { gameState, resetGameState, setRoomTraversalState, setSceneState } from "../game/state";

vi.mock("phaser", () => ({ default: { Scene: class {}, GameObjects: { Sprite: class {} } } }));

beforeEach(() => {
  resetGameState();
  setSceneState("ArchiveScene", "explore", "NORTH: NARA STACKS");
  setRoomTraversalState({ currentRoomId: "AS", roomTitle: "Annotation Stacks", roomType: "puzzle", visitedRoomIds: ["AS"], exits: { north: "DN1", south: "A1" } });
});

describe("annotation exploration cues", () => {
  const cue = () => (new UIScene() as unknown as { compactActionLine(tool: string): string }).compactActionLine("FOLDER");

  it.each([{}, { annotationGatheredMask: 7 }])("keeps the work route until the packet is filed: %j", progress => {
    Object.assign(gameState.sceneProgress, progress);
    expect(cue()).toBe("NOTES / TABLE SOUTH");
  });

  it("shows both exits after completion without altering progress", () => {
    gameState.sceneProgress.annotationDraftingComplete = 1;
    const before = JSON.stringify(gameState);
    expect(cue()).toBe("NARA NORTH / ARCHIVE SOUTH");
    expect(JSON.stringify(gameState)).toBe(before);
  });

  it("keeps a reachable interaction ahead of route advice", () => {
    gameState.sceneProgress.annotationDraftingComplete = 1;
    gameState.nearestInteractable = "NARA Stacks";
    expect(cue()).toBe("INTERACT: NARA STACKS");
  });
});
