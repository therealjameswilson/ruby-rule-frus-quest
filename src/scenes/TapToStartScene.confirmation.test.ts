import { beforeEach, expect, it, vi } from "vitest";
import { TapToStartScene } from "./TapToStartScene";
import { clearSavedGame, loadSavedGame } from "../systems/save";

vi.mock("phaser", () => ({ default: { Scene: class {}, Cameras: { Scene2D: { Events: { FADE_OUT_COMPLETE: "fade" } } } } }));
vi.mock("../systems/audio", () => ({ retroAudio: { unlock: vi.fn(async () => undefined) } }));
vi.mock("../systems/save", () => ({ clearSavedGame: vi.fn(), loadSavedGame: vi.fn(() => "OfficeScene") }));
vi.mock("../input/InputState", () => ({ swallowNextInputFrame: vi.fn() }));

beforeEach(() => vi.clearAllMocks());

it("requires explicit replacement and lets Back preserve the save", async () => {
  const scene = Object.assign(new TapToStartScene(), {
    cameras: { main: { fadeOut: vi.fn(), once: vi.fn() } }
  }) as unknown as { selectedAction: "continue" | "new"; confirmingNew: boolean; confirmSaveChoice(): Promise<void> };
  scene.selectedAction = "new";
  await scene.confirmSaveChoice();
  expect(scene.confirmingNew).toBe(true);
  expect(scene.selectedAction).toBe("continue");
  expect(clearSavedGame).not.toHaveBeenCalled();
  await scene.confirmSaveChoice();
  expect(scene.confirmingNew).toBe(false);
  expect(clearSavedGame).not.toHaveBeenCalled();
  expect(loadSavedGame).not.toHaveBeenCalled();
  scene.selectedAction = "new";
  await scene.confirmSaveChoice();
  scene.selectedAction = "new";
  await scene.confirmSaveChoice();
  expect(clearSavedGame).toHaveBeenCalledOnce();
});
