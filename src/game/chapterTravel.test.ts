import { beforeEach, describe, expect, it } from "vitest";
import { readChapterArrival } from "./chapterTravel";
import { FRUS_ROOM_GRAPH } from "./constants";
import { canTraverseExit } from "./questArchitecture";
import { createGameSaveData, gameState, getRoomGraphReadout, getVisitedRoomIds, resetGameState, restoreGameSaveData, setRoomTraversalState, setSceneState } from "./state";

beforeEach(() => resetGameState());

describe("connected chapter doorways", () => {
  it.each([
    ["A1", "O1", "OfficeScene", 128, 196],
    ["O1", "A1", "ArchiveScene", 30, 120],
    ["N1", "A1", "ArchiveScene", 226, 120],
    ["A1", "N1", "NetworkScene", 30, 124],
    ["R1", "N2", "NetworkScene", 226, 124],
    ["N2", "R1", "ReferralVaultScene", 30, 124],
    ["E1", "R2", "ReferralVaultScene", 226, 124],
    ["R2", "E1", "SilentReadScene", 30, 124]
  ])("arrives from %s at %s's actual doorway", (from, to, scene, x, y) => {
    expect(readChapterArrival({ chapterFrom: from, chapterTo: to }, String(scene))).toMatchObject({ to, x, y });
    expect(Object.values(FRUS_ROOM_GRAPH.find((room) => room.id === from)!.exits)).toContain(to);
  });

  it("rejects missing, malformed, wrong-scene, and arbitrary teleport data", () => {
    for (const data of [undefined, null, 3, {}, { chapterFrom: "G1", chapterTo: "N2" }, { chapterFrom: "E1", chapterTo: "R2" }]) {
      expect(readChapterArrival(data, "NetworkScene")).toBeNull();
    }
  });

  it("never lets a previous visit's Phaser scene data replace a Continue spawn", () => {
    const data = { chapterFrom: "R1", chapterTo: "N2" };
    expect(readChapterArrival(data, "NetworkScene", "ReferralVaultScene")?.to).toBe("N2");
    expect(readChapterArrival(data, "NetworkScene", "NetworkScene")).toBeNull();
  });

  it("keeps return travel free while forward tool gates remain locked", () => {
    for (const room of ["A1", "N1", "R1", "E1"]) expect(canTraverseExit(room, "west", new Set())).toBe(true);
    for (const [room, tool] of [["A1", "citation_stamp"], ["N2", "clearance_token"], ["R2", "concurrence_slip"], ["E1", "red_pencil"], ["S1", "buckram_key"]] as const) {
      expect(canTraverseExit(room, "east", new Set())).toBe(false);
      expect(canTraverseExit(room, "east", new Set([tool]))).toBe(true);
    }
  });

  it("keeps visited rooms on the map across chapters, save/load, and a fresh run", () => {
    setSceneState("NetworkScene", "explore", "Route");
    setRoomTraversalState({ currentRoomId: "N2", roomTitle: "ClassNet", roomType: "reward", visitedRoomIds: ["N1", "N2"], exits: { west: "N1", east: "R1" } });
    setSceneState("ReferralVaultScene", "explore", "Review");
    expect(getVisitedRoomIds(["N1", "N2", "R1"])).toEqual(["N1", "N2"]);
    const save = createGameSaveData();
    resetGameState();
    restoreGameSaveData(save);
    expect(getVisitedRoomIds(["N1", "N2", "R1"])).toEqual(["N1", "N2"]);
    expect(getRoomGraphReadout().find((room) => room.id === "N2")?.visited).toBe(true);
    resetGameState();
    expect(getVisitedRoomIds(["N1", "N2", "R1"])).toEqual([]);
  });

  it("remembers the current legacy save's visited rooms before changing scene", () => {
    gameState.roomTraversal = { currentRoomId: "S1", roomTitle: "Proof", roomType: "reward", visitedRoomIds: ["E1", "S1"], exits: { west: "E1" } };
    expect(getVisitedRoomIds(["E1", "S1"])).toEqual(["E1", "S1"]);
    setSceneState("OfficeScene", "explore", "Return");
    expect(getVisitedRoomIds(["E1", "S1"])).toEqual(["E1", "S1"]);
  });
});
