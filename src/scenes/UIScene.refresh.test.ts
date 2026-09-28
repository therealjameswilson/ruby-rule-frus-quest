import { beforeEach, expect, it, vi } from "vitest";
import { UIScene } from "./UIScene";
import { resetGameState, setSceneState, setPlayerPosition, beginSnesTransition, completeSnesTransition } from "../game/state";
import { retroAudio } from "../systems/audio";

vi.mock("phaser", () => ({ default: { Scene: class {}, GameObjects: { Sprite: class {} } } }));

beforeEach(() => resetGameState());

it("holds one reading mix across dialogue, choice and Codex, then releases on hidden UI", () => {
  const release=vi.fn(),hold=vi.spyOn(retroAudio,'holdReadingMix').mockReturnValue(release);
  let codex=false;
  const scene=Object.assign(new UIScene(),{
    sys:{settings:{visible:true}},time:{now:100},
    scene:{isActive:()=>codex,bringToTop:vi.fn()},
    controls:{refreshForScene:vi.fn(),setEnabled:vi.fn()},
    syncPixelCameras:vi.fn(),refreshQuestBand:vi.fn(),activeGameplaySceneKey:()=>"OfficeScene"
  }) as unknown as UIScene;
  try {
    setSceneState('OfficeScene','dialog','Read');scene.update();scene.update();
    setSceneState('OfficeScene','choice','Choose');scene.update();
    expect(hold).toHaveBeenCalledOnce();expect(release).not.toHaveBeenCalled();
    codex=true;setSceneState('OfficeScene','explore','Explore');scene.update();
    expect(release).not.toHaveBeenCalled();
    scene.sys.settings.visible=false;scene.update();scene.update();
    expect(release).toHaveBeenCalledOnce();
    codex=false;scene.sys.settings.visible=true;scene.update();
    expect(hold).toHaveBeenCalledOnce();
  } finally {hold.mockRestore();}
});

it("refreshes a changed action on the next frame but throttles unchanged meters", () => {
  const text = () => ({ setVisible: vi.fn(), setText: vi.fn(), setColor: vi.fn(), setY: vi.fn() });
  const objective = text(), action = text(), clear = vi.fn();
  const scene = Object.assign(new UIScene(), {
    scene: { isActive: () => false },
    questBandImage: {setVisible:vi.fn(),setY:vi.fn()},
    questBandTexture: {key:"test-hud",getContext:()=>({clearRect:vi.fn()})},
    questBandGraphics: { setVisible: vi.fn(), setY: vi.fn(), setScale:vi.fn(), generateTexture:vi.fn(), clear },
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

// A destination curtain must not retain the departing room's action prompt or
// accept a Codex shortcut. Once travel ends, normal scene controls return.
it("suppresses gameplay chrome during travel and restores it afterward", () => {
  const refreshForScene = vi.fn(), refreshQuestBand = vi.fn();
  const scene = Object.assign(new UIScene(), {
    sys: { settings: { visible: true } }, time: { now: 100 },
    scene: { isActive: () => false, bringToTop: vi.fn() },
    controls: { refreshForScene }, refreshQuestBand,
    syncPixelCameras: vi.fn(), activeGameplaySceneKey: () => "OfficeScene"
  }) as unknown as UIScene;
  beginSnesTransition({fromScene:"OfficeScene",toScene:"ArchiveScene",label:"ARCHIVE"});
  scene.update();
  expect(refreshForScene).toHaveBeenLastCalledWith(null);
  expect(refreshQuestBand).toHaveBeenLastCalledWith(100, null);
  completeSnesTransition();
  scene.update();
  expect(refreshForScene).toHaveBeenLastCalledWith("OfficeScene");
  expect(refreshQuestBand).toHaveBeenLastCalledWith(100, "OfficeScene");
});
