import { beforeEach, describe, expect, it, vi } from "vitest";
import type Phaser from "phaser";
import { NaraStackRecords } from "./naraStackRecords";
import type { FeedbackToast } from "./feedbackToast";
import { DANNE_SCENE_GEOMETRY } from "../game/danneSceneCollisions";
import { addDanneItem, gameState, resetGameState, setSceneState } from "../game/state";
import type { Interactable } from "../game/types";
import { saveGameNow } from "./save";
import { retroAudio } from "./audio";

vi.mock("phaser", () => ({ default: { Display: { Color: { HexStringToColor: () => ({ color: 0 }) } } } }));
vi.mock("./save", () => ({ saveGameNow: vi.fn() }));
vi.mock("./audio", () => ({ retroAudio: { blip: vi.fn(), danneItemPickup: vi.fn() } }));

function node(x: number, y: number) {
  return { x, y, name: "", visible: true,
    setName(name: string) { this.name = name; return this; },
    setVisible(visible: boolean) { this.visible = visible; return this; },
    setScale: vi.fn().mockReturnThis(), setDepth: vi.fn().mockReturnThis(), setStrokeStyle: vi.fn().mockReturnThis(),
    setOrigin: vi.fn().mockReturnThis(), setPosition: vi.fn().mockReturnThis() };
}

function records() {
  const nodes: Array<ReturnType<typeof node>> = [];
  const add = (x: number, y: number) => { const n = node(x, y); nodes.push(n); return n; };
  const scene = { add: { rectangle: add, text: add, image: add }, textures: { exists: () => true } };
  const toast = { show: vi.fn(), visible: false };
  const records = new NaraStackRecords(scene as unknown as Phaser.Scene, toast as unknown as FeedbackToast, () => ({ x: 204, y: 205 }));
  const targets: Interactable[] = DANNE_SCENE_GEOMETRY.NaraStacksScene.interactions.map((definition) => ({ ...definition, onInteract: vi.fn() }));
  return { records, toast, nodes, targets };
}

beforeEach(() => { resetGameState(); setSceneState("NaraStacksScene", "explore", "Find fragment"); vi.clearAllMocks(); });

describe("NARA physical note and fragment", () => {
  it("draws each record at its actual interaction rather than the old patrol-lane coordinates", () => {
    const { nodes } = records();
    for (const [action, name] of [["nara-stacks-note", "nara-stack-note-station"], ["treaty-fragment-nara", "nara-treaty-fragment"]] as const) {
      const target = DANNE_SCENE_GEOMETRY.NaraStacksScene.interactions.find((entry) => entry.action === action)!;
      expect(nodes.find((node) => node.name === name)).toMatchObject({ x: target.x, y: target.y });
    }
  });

  it("reads two short hints without entering a dialogue or granting progression", () => {
    const { records: room, toast } = records();
    room.handle("nara-stacks-note"); room.handle("nara-stacks-note");
    expect(toast.show.mock.calls.map((call) => call[0])).toEqual(["DODGE THE STAMP MARKS", "NE SHELF: REVIEW FOLDER"]);
    expect(gameState.mode).toBe("explore"); expect(gameState.inventory).toEqual([]);
    expect(gameState.sceneProgress.hiddenReadingRoomDiscovered).toBeUndefined();
  });

  it("collects exactly once, saves, removes the paper and hotspot, and leaves the stair and seam alone", () => {
    const { records: room, nodes, targets, toast } = records();
    const reliability = gameState.reliability, points = gameState.documentPoints;
    room.handle("treaty-fragment-nara"); room.syncTargets(targets); room.handle("treaty-fragment-nara");
    expect(gameState.inventory.filter((item) => item === "Treaty Fragment I")).toHaveLength(1);
    expect(gameState.reliability).toBe(reliability); expect(gameState.documentPoints).toBe(points);
    expect(saveGameNow).toHaveBeenCalledOnce(); expect(retroAudio.danneItemPickup).toHaveBeenCalledOnce();
    expect(toast.show).toHaveBeenCalledOnce(); expect(gameState.nearestInteractable).toBeNull();
    expect(nodes.find((node) => node.name === "nara-treaty-fragment")?.visible).toBe(false);
    expect(targets.map((target) => target.id)).toEqual(["stacks-note", "stacks-hidden-reading-room", "stacks-return"]);
  });

  it("honors existing collected saves on room creation without rewarding again", () => {
    addDanneItem("treaty-fragments", 0);
    const { records: room, nodes, targets } = records(); room.syncTargets(targets);
    expect(nodes.find((node) => node.name === "nara-treaty-fragment")?.visible).toBe(false);
    expect(targets.some((target) => target.id === "nara-treaty-fragment")).toBe(false);
    expect(saveGameNow).not.toHaveBeenCalled();
    expect(room.handle("hidden-reading-room-passage")).toBe(false);
  });
});
