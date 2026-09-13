import type Phaser from "phaser";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { gameState, getAdventureSubscreenReadout, resetGameState } from "../game/state";
import { InventoryOverlay } from "./inventory";
import { getPauseMenuReadout } from "./pauseMenu";

const input = vi.hoisted(() => ({ navUpJustPressed: false, navDownJustPressed: false, navLeftJustPressed: false,
  navRightJustPressed: false, aJustPressed: false, confirmJustPressed: false }));
const callbacks = vi.hoisted(() => ({ handlePauseTouch: (_point: { x: number; y: number }) => false }));
const swallowed = vi.hoisted(() => vi.fn());
vi.mock("phaser", () => ({ default: {
  Display: { Color: { HexStringToColor: () => ({ color: 0 }) } },
  Input: { Events: { POINTER_DOWN: "pointerdown" } }, Scenes: { Events: { SHUTDOWN: "shutdown" } }
} }));
vi.mock("../input/InputState", () => ({
  bindPointerPress: vi.fn(), getInput: () => input, getPrimaryActionBadge: () => "A", swallowNextInputFrame: swallowed,
  updateInputCallbacks: (next: typeof callbacks) => Object.assign(callbacks, next)
}));
vi.mock("./audio", () => ({ retroAudio: { blip: vi.fn(), confirm: vi.fn(), warning: vi.fn(), isEnabled: false, toggle: vi.fn() } }));

class Node {
  visible = true;
  name = "";
  depth = 0;
  setScrollFactor() { return this; } setStrokeStyle() { return this; } setOrigin() { return this; }
  setName(value: string) { this.name = value; return this; }
  setDepth(value: number) { this.depth = value; return this; }
  setVisible(value: boolean) { this.visible = value; return this; }
  removeAll() { return this; } add() { return this; }
  lineStyle() { return this; } lineBetween() { return this; } fillStyle() { return this; } fillRect() { return this; }
}

function harness() {
  const loop = { frame: 0 };
  const containers: Node[] = [];
  const texts: string[] = [];
  const scene = {
    add: { rectangle: () => new Node(), container: () => {
      const node = new Node(); containers.push(node); return node;
    }, text: (_x: number, _y: number, text: string) => { texts.push(text); return new Node(); }, graphics: () => new Node() },
    textures: { exists: () => false }, input: { on: vi.fn(), off: vi.fn() }, events: { once: vi.fn() }, game: { loop }
  } as unknown as Phaser.Scene;
  const overlay = new InventoryOverlay(scene);
  const tap = (id: string) => {
    const hit = getPauseMenuReadout()?.controls.find((control) => control.id === id);
    if (!hit) throw Error(`Missing control ${id}`);
    loop.frame++;
    callbacks.handlePauseTouch({ x: hit.x, y: hit.y });
  };
  const key = (name: keyof typeof input) => {
    for (const field of Object.keys(input) as Array<keyof typeof input>) input[field] = field === name;
    overlay.updateInput();
    input[name] = false;
  };
  return { overlay, tap, key, loop, containers, texts };
}

beforeEach(() => {
  resetGameState(); gameState.mode = "explore";
  for (const name of Object.keys(input) as Array<keyof typeof input>) input[name] = false;
  vi.clearAllMocks();
});

describe("pause inventory interaction", () => {
  it("shows the live objective only on the current chapter map", () => {
    gameState.objective = "PICK UP SOURCE NOTE";
    const { overlay, tap, texts } = harness();
    overlay.toggle(); tap("map");
    expect(texts.at(-1)).toBe(gameState.objective);
    tap("next");
    expect(texts.at(-1)).toContain("LOCKED");
    gameState.objective = "RETURN TO THE DESK";
    tap("previous");
    expect(texts.at(-1)).toBe(gameState.objective);
    overlay.hide();
  });
  it("covers the existing 1200-depth feedback and 1700-depth cutscene chrome", () => {
    const { overlay, containers } = harness();
    overlay.toggle();
    const menu = containers.find((node) => node.name === "pause-menu")!;
    expect(menu.visible).toBe(true);
    expect(menu.depth).toBeGreaterThan(1700);
    overlay.hide();
  });

  it("allows empty-inventory players to reach the map and settings with a keyboard", () => {
    const { overlay, key } = harness(); overlay.toggle();
    key("navUpJustPressed"); key("navRightJustPressed");
    expect(getPauseMenuReadout()).toMatchObject({ page: "map", focus: "header" });
    key("navDownJustPressed"); const area = getPauseMenuReadout()?.mapArea; key("navRightJustPressed");
    expect(getPauseMenuReadout()?.mapArea).not.toBe(area);
    key("navUpJustPressed"); key("navRightJustPressed"); key("navRightJustPressed");
    expect(getPauseMenuReadout()?.page).toBe("settings"); overlay.hide();
  });

  it("selects on first tap, equips on the next tap, and ignores duplicate delivery", () => {
    gameState.inventory.push("Citation Stamp", "Review Folder");
    gameState.equippedProcessItem = "citation_stamp";
    const { overlay, tap, texts } = harness(); overlay.toggle(); tap("tool-2");
    expect(gameState.equippedProcessItem).toBe("citation_stamp");
    expect(texts.at(-1)).toBe("A / TAP AGAIN TO EQUIP");
    const hit = getPauseMenuReadout()!.controls.find((control) => control.id === "tool-2")!;
    callbacks.handlePauseTouch(hit);
    expect(gameState.equippedProcessItem).toBe("citation_stamp");
    tap("tool-2"); expect(gameState.equippedProcessItem).toBe("review_folder");
    expect(texts.at(-1)).toBe("EQUIPPED"); overlay.hide();
  });

  it("does not grant or equip locked items", () => {
    const { overlay, tap, key } = harness(); overlay.toggle(); tap("tool-2"); key("confirmJustPressed");
    expect(gameState.equippedProcessItem).toBeNull(); expect(gameState.inventory).toEqual([]); overlay.hide();
  });

  it("backs out of item details before closing the menu", () => {
    gameState.inventory.push("Master Declass Key");
    const { overlay, tap, texts } = harness();
    overlay.toggle(); tap("tool-8");
    expect(texts.at(-1)).toBe("A / TAP AGAIN TO VIEW");
    tap("tool-8");
    expect(getPauseMenuReadout()?.detailOpen).toBe(true);
    overlay.back();
    expect(getPauseMenuReadout()?.detailOpen).toBe(false);
    expect(overlay.active).toBe(true);
    expect(gameState.mode).toBe("pause");
    overlay.back();
    expect(overlay.active).toBe(false);
    expect(gameState.mode).toBe("explore");
  });

  it("removes all item hit targets when another page is shown", () => {
    gameState.inventory.push("Review Folder");
    const { overlay, tap, loop } = harness(); overlay.toggle(); tap("settings"); loop.frame++;
    callbacks.handlePauseTouch({ x: 152, y: 128 });
    expect(gameState.equippedProcessItem).toBeNull();
    expect(getPauseMenuReadout()?.controls.some((hit) => hit.id.startsWith("tool-"))).toBe(false); overlay.hide();
  });

  it("restores play without a falling-through input or persisted menu state", () => {
    const { overlay, tap } = harness(); overlay.toggle(); tap("close");
    expect(overlay.active).toBe(false); expect(gameState.mode).toBe("explore");
    expect(getPauseMenuReadout()).toBeNull(); expect(swallowed).toHaveBeenCalledOnce();
    expect(callbacks.handlePauseTouch({ x: 48, y: 80 })).toBe(false);
  });

  it("preserves keys, inventory and reliability while paging through chapters and records", () => {
    getAdventureSubscreenReadout();
    const before = JSON.stringify({ inventory: gameState.inventory, dungeons: gameState.dungeons, reliability: gameState.reliability });
    const { overlay, tap } = harness(); overlay.toggle(); tap("map");
    for (let index = 0; index < 8; index++) tap("next");
    tap("record"); for (let index = 0; index < 20; index++) tap("next"); overlay.hide();
    expect(JSON.stringify({ inventory: gameState.inventory, dungeons: gameState.dungeons, reliability: gameState.reliability })).toBe(before);
  });
});
