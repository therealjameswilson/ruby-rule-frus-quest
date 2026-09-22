import { beforeEach, expect, it, vi } from "vitest";
import { UIScene } from "./UIScene";
import { resetGameState, setSceneState, setPlayerPosition } from "../game/state";

vi.mock("phaser", () => ({ default: { Scene: class {}, GameObjects: { Sprite: class {} } } }));

beforeEach(() => resetGameState());

it("refreshes a changed action on the next frame but throttles unchanged meters", () => {
  const text = () => ({ setVisible: vi.fn(), setText: vi.fn(), setColor: vi.fn(), setY: vi.fn() });
  const objective = text(), action = text(), clear = vi.fn();
  const scene = Object.assign(new UIScene(), {
    scene: { isActive: () => false },
    questBandGraphics: { setVisible: vi.fn(), setY: vi.fn(), clear },
    questBandText: objective, questBandCueText: action,
    questBandToolText: text(), questBandVerbText: text(),
    drawQuestBandChrome: vi.fn(), drawQuestBandActionBadge: vi.fn(),
    drawQuestBandToolSlot: vi.fn(), drawQuestBandVolumeAssembly: vi.fn()
  }) as unknown as { refreshQuestBand(now: number, sceneKey: string): void };
  setSceneState("BlackVaultLairScene", "explore", "RETURN THE BOLT");
  scene.refreshQuestBand(1000, "BlackVaultLairScene");
  expect(objective.setText).toHaveBeenLastCalledWith("RETURN THE BOLT");
  scene.refreshQuestBand(1016, "BlackVaultLairScene");
  expect(clear).toHaveBeenCalledTimes(1);
  setPlayerPosition({ x: 128, y: 42 });
  scene.refreshQuestBand(1020, "BlackVaultLairScene");
  expect(objective.setY).toHaveBeenLastCalledWith(218);
  expect(clear).toHaveBeenCalledTimes(1);
  setSceneState("BlackVaultLairScene", "explore", "PENCIL THE CORE");
  scene.refreshQuestBand(1032, "BlackVaultLairScene");
  expect(objective.setText).toHaveBeenLastCalledWith("PENCIL THE CORE");
  expect(clear).toHaveBeenCalledTimes(2);
  setSceneState("BlackVaultLairScene", "explore", "RETURN THE BOLT");
  scene.refreshQuestBand(1048, "BlackVaultLairScene");
  expect(objective.setText).toHaveBeenLastCalledWith("RETURN THE BOLT");
});
