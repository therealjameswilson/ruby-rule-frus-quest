import { beforeEach, describe, expect, it, vi } from "vitest";
import { NaraStacksScene } from "./NaraStacksScene";
import { resetGameState, setSceneState } from "../game/state";

const input = vi.hoisted(() => ({ pauseJustPressed: false, menuJustPressed: false }));
vi.mock("../input/InputState", () => ({ tickInput: vi.fn(), getInput: () => input }));
vi.mock("phaser", () => ({ default: { Scene: class {}, GameObjects: { Sprite: class {} } } }));
vi.mock("../systems/cutscene", () => ({ isCutsceneActive: () => false }));
vi.mock("../systems/overlayInput", () => ({ handleOpenOverlays: (inventory: { active: boolean }) => inventory.active }));

beforeEach(() => {
  resetGameState();
  setSceneState("NaraStacksScene", "explore", "FIND FRAGMENT I");
  input.pauseJustPressed = false;
  input.menuJustPressed = false;
});

describe("map pause input ordering", () => {
  it.each(["pauseJustPressed", "menuJustPressed"] as const)("freezes enemies on the %s input frame", button => {
    const enemies = vi.fn();
    const player = { position: { x: 128, y: 152 }, setCombatPaused: vi.fn(), update: vi.fn() };
    const inventory = { active: false, toggle: vi.fn(() => { inventory.active = !inventory.active; }) };
    const scene = new NaraStacksScene();
    Object.assign(scene, {
      time: { now: 1000 }, player, inventory,
      cacheToast: { update: vi.fn() }, prompt: { update: vi.fn() },
      dialog: { active: false }, choice: { active: false }, reliability: { active: false, update: vi.fn() },
      updateDanneEntities: enemies, restoreSafePlayerPosition: vi.fn()
    });
    input[button] = true;
    scene.update(1000, 16);
    expect(enemies).toHaveBeenCalledExactlyOnceWith(1000, 16, false);
    expect(player.setCombatPaused).toHaveBeenCalledWith(true);
    expect(inventory.toggle).toHaveBeenCalledOnce();
    expect(inventory.active).toBe(true);
    input[button] = false;
    scene.update(1016, 16);
    expect(enemies).toHaveBeenLastCalledWith(1000, 16, false);
  });
});
