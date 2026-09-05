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
