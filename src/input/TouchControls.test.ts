import { beforeEach, describe, expect, it, vi } from "vitest";
import { gameState, resetGameState } from "../game/state";
import { TouchControls } from "./TouchControls";

vi.mock("phaser", () => ({ default: {} }));
vi.mock("./InputState", () => ({}));
vi.mock("../platform/haptics", () => ({}));

beforeEach(() => resetGameState());

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
