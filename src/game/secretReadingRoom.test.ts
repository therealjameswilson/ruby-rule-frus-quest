import { beforeEach, describe, expect, it } from "vitest";
import { canRevealReadingPassage, HIDDEN_READING_ROOM_DISCOVERED_FLAG, hiddenFirstEditionFound, hiddenReadingRoomDiscovered, insideReadingPassage, readingPassageLabel, readingPassageSolids, READING_PASSAGE } from "./secretReadingRoom";
import { addProcessItem, createGameSaveData, gameState, getAdventureSubscreenReadout, getRoomGraphReadout, getVisitedRoomIds, resetGameState, restoreGameSaveData, setRoomTraversalState, setSceneState } from "./state";
import { DANNE_SCENE_GEOMETRY } from "./danneSceneCollisions";
import { buildWeaponHitbox, WeaponStateController } from "../systems/weaponState";
import { reachedReadingRoomReturn } from "./secretReadingRoom";

beforeEach(() => resetGameState());

describe("physical reading-room discovery", () => {
  const position = { x: 204, y: 88 };
  const hitbox = buildWeaponHitbox(position, "north", "review_folder");

  it("returns only at the open threshold, not on arrival or at the side walls", () => {
    expect(reachedReadingRoomReturn({ x: 128, y: 208 })).toBe(false);
    expect(reachedReadingRoomReturn({ x: 128, y: 221 })).toBe(false);
    for (const x of [120, 128, 136]) expect(reachedReadingRoomReturn({ x, y: 222 })).toBe(true);
    for (const x of [112, 119, 137, 144]) expect(reachedReadingRoomReturn({ x, y: 222 })).toBe(false);
  });

  it("requires a held Review Folder and a contacting active swing", () => {
    expect(canRevealReadingPassage(false, true, "review_folder", hitbox)).toBe(true);
    expect(canRevealReadingPassage(false, false, "review_folder", hitbox)).toBe(false);
    for (const tool of ["citation_stamp", "red_pencil", null] as const) {
      expect(canRevealReadingPassage(false, true, tool, hitbox)).toBe(false);
    }
    expect(canRevealReadingPassage(true, true, "review_folder", hitbox)).toBe(false);
    expect(canRevealReadingPassage(false, true, "review_folder", null)).toBe(false);
    expect(canRevealReadingPassage(false, true, "review_folder", buildWeaponHitbox(position, "south", "review_folder"))).toBe(false);
    expect(canRevealReadingPassage(false, true, "review_folder", buildWeaponHitbox({ x: 128, y: 205 }, "north", "review_folder"))).toBe(false);
  });

  it("opens only during real weapon active frames, never windup or cooldown", () => {
    const weapon = new WeaponStateController();
    weapon.tryStart("review_folder", 1000);
    for (const [time, opens] of [[1000, false], [1119, false], [1120, true], [1294, true], [1295, false], [1595, false]] as const) {
      expect(canRevealReadingPassage(false, true, weapon.tool, weapon.activeHitbox(position, "north", time))).toBe(opens);
    }
  });

  it("opens only the shelf's center and preserves every other obstacle", () => {
    const original = DANNE_SCENE_GEOMETRY.NaraStacksScene.solids;
    expect(readingPassageSolids(original, false)).toBe(original);
    const opened = readingPassageSolids(original, true);
    expect(opened.filter((rect) => rect.label !== READING_PASSAGE.shelfLabel))
      .toEqual(original.filter((rect) => rect.label !== READING_PASSAGE.shelfLabel));
    expect(opened.filter((rect) => rect.label === READING_PASSAGE.shelfLabel)).toEqual([
      { x: 178, y: 52, width: 10, height: 28, label: READING_PASSAGE.shelfLabel },
      { x: 220, y: 52, width: 12, height: 28, label: READING_PASSAGE.shelfLabel }
    ]);
    expect(original.find((rect) => rect.label === READING_PASSAGE.shelfLabel)?.width).toBe(54);
    expect(insideReadingPassage({ x: 204, y: 80 })).toBe(true);
    expect(insideReadingPassage(READING_PASSAGE.returnSpawn)).toBe(false);
    expect(insideReadingPassage({ x: 180, y: 68 })).toBe(false);
  });

  it("does not reveal or open the secret on the map merely by owning a tool or map", () => {
    addProcessItem("review_folder");
    gameState.dungeons.archive_cavern.mapRevealed = true;
    expect(getRoomGraphReadout().find((room) => room.id === "DN2")?.revealed).toBe(false);
    expect(getRoomGraphReadout().find((room) => room.id === "DN1")?.lockedExitState.north.canOpen).toBe(false);
    gameState.sceneProgress[HIDDEN_READING_ROOM_DISCOVERED_FLAG] = 1;
    expect(getRoomGraphReadout().find((room) => room.id === "DN2")?.revealed).toBe(true);
    expect(getRoomGraphReadout().find((room) => room.id === "DN1")?.lockedExitState.north.canOpen).toBe(true);
  });

  it("persists discovery and actual visits separately from collecting the reward", () => {
    gameState.sceneProgress[HIDDEN_READING_ROOM_DISCOVERED_FLAG] = 1;
    setRoomTraversalState({ currentRoomId: "DN2", roomTitle: "Hidden", roomType: "secret", visitedRoomIds: ["DN1", "DN2"], exits: { south: "DN1" } });
    setSceneState("SilentReadScene", "explore", "Return");
    const saved = createGameSaveData();
    resetGameState();
    restoreGameSaveData(saved);
    expect(hiddenReadingRoomDiscovered(gameState)).toBe(true);
    expect(hiddenFirstEditionFound(gameState)).toBe(false);
    expect(getVisitedRoomIds(["DN1", "DN2"])).toEqual(["DN1", "DN2"]);
    expect(readingPassageLabel(true, false)).toBe("Reading Room");
    resetGameState();
    expect(hiddenReadingRoomDiscovered(gameState)).toBe(false);
    expect(getVisitedRoomIds(["DN1", "DN2"])).toEqual([]);
  });

  it("shows the discovered room on the Archive pause map, not the Office map", () => {
    setSceneState("HiddenReadingRoomScene", "explore", "CLAIM FIRST EDITION");
    gameState.sceneProgress[HIDDEN_READING_ROOM_DISCOVERED_FLAG] = 1;
    setRoomTraversalState({ currentRoomId: "DN2", roomTitle: "Hidden", roomType: "secret", visitedRoomIds: ["DN1", "DN2"], exits: { south: "DN1" } });
    const map = getAdventureSubscreenReadout().roomMap;
    expect(map.currentAreaId).toBe("archive_cavern");
    expect(map.currentRoomId).toBe("DN2");
    expect(map.rooms.find((room) => room.id === "DN2")).toMatchObject({ visited: true, revealed: true });
    expect(map.rooms.some((room) => room.id === "DN1")).toBe(true);
    expect(map.rooms.some((room) => room.id === "O1")).toBe(false);
  });
});
