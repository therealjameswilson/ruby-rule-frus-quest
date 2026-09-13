import { beforeEach, describe, expect, it, vi } from "vitest";
import type Phaser from "phaser";
import { gameState, resetGameState } from "../game/state";
import { resolveTouchDirection, TouchControls } from "./TouchControls";

vi.mock("phaser", () => ({ default: { Math: { Vector2: class {} },
  Input: { Events: { POINTER_DOWN: "pointerdown", POINTER_MOVE: "pointermove", POINTER_UP: "pointerup", POINTER_UP_OUTSIDE: "pointerupoutside" } },
  Scenes: { Events: { SHUTDOWN: "shutdown" } } } }));
vi.mock("./InputState", () => ({ updateInputCallbacks: vi.fn() }));
vi.mock("../platform/haptics", () => ({}));

beforeEach(() => resetGameState());

describe("touch layout lifecycle", () => {
  it("releases held input on resize/rotation and removes listeners on shutdown", () => {
    const add = vi.fn(), remove = vi.fn();
    vi.stubGlobal("window", { addEventListener: add, removeEventListener: remove });
    vi.stubGlobal("navigator", { maxTouchPoints: 0 });
    const prototype = TouchControls.prototype as unknown as { createButtons(): []; setEnabled(): void };
    vi.spyOn(prototype, "createButtons").mockReturnValue([]);
    vi.spyOn(prototype, "setEnabled").mockImplementation(() => {});
    const graphics = { setDepth: vi.fn().mockReturnThis(), setScrollFactor: vi.fn().mockReturnThis(), destroy: vi.fn() };
    const scene = { add: { graphics: () => graphics }, input: { on: vi.fn(), off: vi.fn() },
      events: { once: vi.fn() }, game: { canvas: { addEventListener: vi.fn(), removeEventListener: vi.fn() } } };
    try {
      const controls = new TouchControls(scene as unknown as Phaser.Scene);
      const release = vi.fn(), redraw = vi.fn();
      Object.assign(controls, { releaseAll: release, redraw });
      for (const event of ["resize", "orientationchange"]) {
        const handler = add.mock.calls.find(call => call[0] === event)?.[1] as (() => void);
        expect(handler).toBeTypeOf("function");
        handler();
      }
      expect(release).toHaveBeenCalledTimes(2);
      expect(redraw).toHaveBeenCalledTimes(2);
      controls.destroy();
      for (const event of ["resize", "orientationchange"]) {
        expect(remove).toHaveBeenCalledWith(event, add.mock.calls.find(call => call[0] === event)?.[1]);
      }
    } finally { vi.restoreAllMocks(); vi.unstubAllGlobals(); }
  });
});

describe("floating pad direction stability", () => {
  it.each([-1, 1])("keeps the held direction near diagonal boundaries with sign %s", sign => {
    const horizontal = sign < 0 ? "left" : "right";
    const vertical = sign < 0 ? "up" : "down";
    expect(resolveTouchDirection(sign * 20, sign * 21, horizontal)).toBe(horizontal);
    expect(resolveTouchDirection(sign * 21, sign * 20, vertical)).toBe(vertical);
    expect(resolveTouchDirection(sign * 20, sign * 26, horizontal)).toBe(vertical);
    expect(resolveTouchDirection(sign * 26, sign * 20, vertical)).toBe(horizontal);
  });
  it("stops inside the dead zone and reverses without waiting", () => {
    expect(resolveTouchDirection(3, 4, "right")).toBeNull();
    expect(resolveTouchDirection(-20, 0, "right")).toBe("left");
    expect(resolveTouchDirection(0, 20, "up")).toBe("down");
    expect(resolveTouchDirection(0, -12, null)).toBe("up");
  });
  it("uses the nearest cardinal for a fresh gesture", () => {
    expect(resolveTouchDirection(20, -21, null)).toBe("up");
    expect(resolveTouchDirection(-21, 20, null)).toBe("left");
  });
});

function refresh(scene: string) {
  const enabled = vi.fn();
  const controls = Object.create(TouchControls.prototype) as TouchControls;
  Object.assign(controls, {
    forceVisible: true,
    gamepadSuppressed: false,
    overlayAlpha: 1,
    setEnabled: enabled
  });
  controls.refreshForScene(scene);
  return enabled;
}

describe("touch controls on publication screens", () => {
  it("removes the unused map B hit area and restores it in gameplay", () => {
    const controls = Object.create(TouchControls.prototype) as TouchControls;
    Object.assign(controls, { buttons: [
      { key: "b", x: 174, y: 216, hitWidth: 48, hitHeight: 48 },
      { key: "space", x: 225, y: 205, hitWidth: 58, hitHeight: 58 }
    ] });
    const hit = Reflect.get(controls, "findButtonAt") as (x: number, y: number) => { key: string } | undefined;
    gameState.currentScene = "WorldMapScene";
    expect(hit.call(controls, 174, 216)).toBeUndefined();
    expect(hit.call(controls, 225, 205)?.key).toBe("space");
    gameState.currentScene = "GameplayMapScene";
    expect(hit.call(controls, 174, 216)?.key).toBe("b");
  });
  it("leaves title commands clear but restores controls for character creation", () => {
    expect(refresh("TitleScene")).toHaveBeenCalledWith(false);
    expect(refresh("CharacterCreateScene")).toHaveBeenCalledWith(true);
    expect(refresh("OfficeScene")).toHaveBeenCalledWith(true);
  });
  it("does not let invisible action buttons steal pause menu taps", () => {
    const controls = Object.create(TouchControls.prototype) as TouchControls;
    Object.assign(controls, { buttons: [{ key: "a", x: 225, y: 205, hitWidth: 44, hitHeight: 44 }] });
    const hit = Reflect.get(controls, "findButtonAt") as (x: number, y: number) => { key: string } | undefined;
    gameState.mode = "explore";
    expect(hit.call(controls, 225, 205)?.key).toBe("a");
    gameState.mode = "pause";
    expect(hit.call(controls, 225, 205)).toBeUndefined();
  });
  it("leaves the secret reward's own large buttons unobstructed", () => {
    gameState.mode = "ending";
    expect(refresh("TrueEndingScene")).toHaveBeenCalledWith(false);
    expect(refresh("EndingScene")).toHaveBeenCalledWith(false);
  });

  it("retains movement and action buttons while playing the bindery and boss", () => {
    gameState.mode = "explore";
    expect(refresh("EndingScene")).toHaveBeenCalledWith(true);
    expect(refresh("BlackVaultLairScene")).toHaveBeenCalledWith(true);
  });
});
