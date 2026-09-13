import { describe, expect, it } from "vitest";
import { ANNOTATION_STACKS, annotationStacksOpen, annotationStacksObjective, buildAnnotationStackLayers } from "./annotationStacks";
import { gatherAnnotationNote, readAnnotationPacket } from "./annotationPacket";
import { createGameSaveData, gameState, getRoomGraphReadout, resetGameState, restoreGameSaveData, setRoomTraversalState } from "./state";
import { FRUS_ROOM_GRAPH } from "./constants";
import { canTraverseExit } from "./questArchitecture";
import { pixelFontMetrics } from "../systems/pixelFontMetrics";

describe("Annotation Stacks discovery", () => {
  it("opens after the physical stamp payoff, preserving legacy partial and completed packets", () => {
    expect(annotationStacksOpen({})).toBe(false);
    expect(annotationStacksOpen({ archiveSourceNoteStamped: 1 })).toBe(false);
    const saves: Record<string, number>[] = [{ archiveRepoWallCleared: 1 }, { annotationDraftingStep: 1 },
      { annotationDraftingCarried: 2 }, { annotationGatheredMask: 4 }, { annotationDraftingComplete: 1 },
      { archiveSourceRoomComplete: 1 }];
    for (const progress of saves) expect(annotationStacksOpen(progress)).toBe(true);
  });

  it("connects the source room and NARA wing with an unconditional return", () => {
    expect(FRUS_ROOM_GRAPH.find(room => room.id === "A1")?.exits.north).toBe("AS");
    expect(FRUS_ROOM_GRAPH.find(room => room.id === "AS")?.exits).toEqual({ north: "DN1", south: "A1" });
    expect(canTraverseExit("A1", "north", new Set())).toBe(false);
    expect(canTraverseExit("A1", "north", new Set(["citation_stamp"]))).toBe(true);
    expect(canTraverseExit("AS", "south", new Set())).toBe(true);
  });

  it("has four floor variants, matching solids, and connected generous reading aisles", () => {
    const { ground, walls, collisionCells } = buildAnnotationStackLayers();
    expect(ground).toHaveLength(12);
    expect(ground.every(row => row.length === 16)).toBe(true);
    expect(new Set(ground.flat()).size).toBe(4);
    for (let y = 0; y < 12; y++) for (let x = 0; x < 16; x++) {
      expect(collisionCells.some(cell => cell.tileX === x && cell.tileY === y)).toBe(walls[y][x] > 0);
    }
    const visited = new Set<string>();
    const queue = [[8, 10]];
    while (queue.length) {
      const [x, y] = queue.shift()!;
      const key = `${x},${y}`;
      if (visited.has(key) || walls[y]?.[x] !== -1) continue;
      visited.add(key);
      queue.push([x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]);
    }
    for (const position of Object.values(ANNOTATION_STACKS.stations)) {
      expect(visited.has(`${Math.floor(position.x / 16)},${Math.floor((position.y - 32) / 16)}`)).toBe(true);
    }
    for (let y = 1; y < 11; y++) for (const x of [1, 2, 3, 6, 7, 8, 9, 12, 13, 14]) expect(walls[y][x]).toBe(-1);
    for (const y of [0, 11]) for (const x of [7, 8]) expect(visited.has(`${x},${y}`)).toBe(true);
  });

  it("shows the actual review gates on the pause map, not just tool ownership", () => {
    resetGameState();
    const entry = () => getRoomGraphReadout().find(room => room.id === "A1")!.lockedExitState.north;
    const exit = () => getRoomGraphReadout().find(room => room.id === "AS")!.lockedExitState.north;
    expect(entry().canOpen).toBe(false);
    gameState.sceneProgress.archiveSourceNoteStamped = 1;
    expect(entry().canOpen).toBe(false);
    gameState.sceneProgress.archiveRepoWallCleared = 1;
    expect(entry().canOpen).toBe(true);
    gameState.sceneProgress.annotationGatheredMask = 7;
    expect(exit().canOpen).toBe(false);
    expect(exit().blockedMessage).toContain("human research table");
    gameState.sceneProgress.annotationDraftingComplete = 1;
    expect(exit().canOpen).toBe(true);
    resetGameState();
  });

  it("persists room, carried notes and partial legacy progress without filing or rewards", () => {
    resetGameState();
    gameState.currentScene = "ArchiveScene";
    gameState.sceneProgress.annotationDraftingStep = 1;
    gameState.sceneProgress.annotationGatheredMask = gatherAnnotationNote(gameState.sceneProgress, "selectivity_mitigation").gatheredMask;
    setRoomTraversalState({ currentRoomId: "AS", roomTitle: "ANNOTATION STACKS", roomType: "puzzle",
      visitedRoomIds: ["A1", "AS"], revealedRoomIds: ["A1", "AS"], exits: { south: "A1", north: "DN1" } });
    const before = createGameSaveData();
    restoreGameSaveData(before);
    expect(gameState.roomTraversal?.currentRoomId).toBe("AS");
    const packet = readAnnotationPacket(gameState.sceneProgress);
    expect(packet.gathered).toHaveLength(2);
    expect(packet.held).toHaveLength(1);
    expect(packet.complete).toBe(false);
    expect(gameState.documentPoints).toBe(before.state.documentPoints);
    expect(gameState.documentCandidates).toEqual(before.state.documentCandidates);
    expect(gameState.inventory).toEqual(before.state.inventory);
    expect(gameState.processStamps).toEqual(before.state.processStamps);
    resetGameState();
  });

  it("fits objectives in the native HUD", () => {
    const saves: Record<string, number>[] = [{}, { annotationGatheredMask: 7 }, { annotationDraftingComplete: 1 }];
    for (const progress of saves) {
      expect(annotationStacksObjective(progress).length * pixelFontMetrics(8).advance).toBeLessThanOrEqual(144);
    }
  });
});
