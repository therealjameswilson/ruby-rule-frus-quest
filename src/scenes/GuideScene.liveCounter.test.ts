import { beforeEach, describe, expect, it, vi } from "vitest";
import { GuideScene } from "./GuideScene";
import { GUIDE_COUNTER, GuideCounterTraining, setGuideCounterReadout } from "../game/guideCounterTraining";
import { addProcessItem, gameState, resetGameState } from "../game/state";
import { saveGameNow } from "../systems/save";
import { getSecondaryActionBadge } from "../input/InputState";

vi.mock("phaser", () => ({ default: {
  Scene: class {}, GameObjects: { Sprite: class {} },
  Math: { Distance: { Between: (x: number, y: number, x2: number, y2: number) => Math.hypot(x - x2, y - y2) } },
  Display: { Color: { HexStringToColor: () => ({ color: 0 }) } }
} }));
vi.mock("../entities/Player", () => ({ Player: class {} }));
vi.mock("../systems/save", () => ({ saveGameNow: vi.fn() }));
vi.mock("../systems/audio", () => ({ retroAudio: { toolHit: vi.fn(), egoBoltFire: vi.fn(), blip: vi.fn(), warning: vi.fn(), confirm: vi.fn(), stamp: vi.fn() } }));

interface LessonScene {
  practiceBolt: ReturnType<typeof graphic>;
  counterTraining: GuideCounterTraining;
  hasStamp: boolean;
  hasFragment: boolean;
  hasCounterTraining: boolean;
  player: {
    position: { x: number; y: number };
    combatReadout: { weapon: { tool: string } };
    activeActionHitbox: { x: number; y: number; width: number; height: number } | null;
  };
  syncStagePresentation: ReturnType<typeof vi.fn>;
  updateCitationCounterTraining(delta: number): void;
  takeFragment(): void;
  openGate(): void;
  remindCounterInput(): void;
  updateCounterSwing(pressed: boolean): void;
  setLessonPaused(paused: boolean): void;
  toast: { show: ReturnType<typeof vi.fn> };
}

function graphic() {
  return Object.fromEntries(["clear", "fillStyle", "fillRect", "lineStyle", "strokeRect", "setAlpha", "setVisible", "setPosition", "setTint", "setTintFill", "setStrokeStyle", "setDepth"].map((key) => [key, vi.fn().mockReturnThis()]));
}
function scene() {
  return Object.assign(new GuideScene(), {
    hasStamp: true, hasFragment: false, hasCounterTraining: false,
    counterTraining: new GuideCounterTraining(),
    player: { position: { x: 96, y: 160 }, combatReadout: { weapon: { tool: "citation_stamp" } }, activeActionHitbox: null },
    practiceAim: graphic(), egoSealGlow: graphic(), practiceBolt: graphic(),
    add: { circle: () => graphic() }, tweens: { add: vi.fn() }, toast: { show: vi.fn(), hide: vi.fn() },
    syncStagePresentation: vi.fn()
  }) as unknown as LessonScene;
}
function advance(scene: LessonScene, ms: number) {
  for (let t = 0; t < ms; t += 10) scene.updateCitationCounterTraining(10);
}

beforeEach(() => {
  resetGameState();
  setGuideCounterReadout(null);
  vi.clearAllMocks();
});

describe("GuideScene live counter integration", () => {
  it("remembers a late swing once but expires a too-early press", () => {
    const guide = scene(), time = { now: 0 }, startAction = vi.fn(() => true), faceTowards = vi.fn();
    const combat = { state: "idle", weapon: { tool: "citation_stamp", canSwing: false } };
    addProcessItem("citation_stamp");
    gameState.equippedProcessItem = "citation_stamp";
    Object.assign(guide, { time, player: { ...guide.player, startAction, faceTowards, combatReadout: combat } });
    guide.updateCounterSwing(true);
    expect(startAction).not.toHaveBeenCalled();
    time.now = 90;
    combat.weapon.canSwing = true;
    guide.updateCounterSwing(false);
    guide.updateCounterSwing(false);
    expect(startAction).toHaveBeenCalledExactlyOnceWith("citation_stamp");
    expect(faceTowards).toHaveBeenCalledExactlyOnceWith(GUIDE_COUNTER.source);
    combat.weapon.canSwing = false;
    guide.updateCounterSwing(true);
    time.now = 210;
    combat.weapon.canSwing = true;
    guide.updateCounterSwing(false);
    expect(startAction).toHaveBeenCalledOnce();
  });
  it.each(["pause", "stage"])("clears pending swings on %s", interruption => {
    const guide = scene(), time = { now: 0 }, startAction = vi.fn(() => true);
    const combat = { state: "idle", weapon: { tool: "citation_stamp", canSwing: false } };
    addProcessItem("citation_stamp");
    gameState.equippedProcessItem = "citation_stamp";
    Object.assign(guide, { time, egoSeal: { setActive: vi.fn() }, practiceBolt: { setActive: vi.fn() },
      player: { ...guide.player, startAction, combatReadout: combat, setCombatPaused: vi.fn() } });
    guide.updateCounterSwing(true);
    if (interruption === "pause") guide.setLessonPaused(true);
    else {
      guide.hasCounterTraining = true;
      guide.updateCounterSwing(false);
      guide.hasCounterTraining = false;
    }
    time.now = 80;
    combat.weapon.canSwing = true;
    guide.updateCounterSwing(false);
    expect(startAction).not.toHaveBeenCalled();
  });
  it("visibly corrects the interaction button without awarding or pausing the lesson", () => {
    const guide = scene();
    gameState.mode = "explore";
    const lesson = guide.counterTraining.readout();
    guide.remindCounterInput();
    expect(guide.toast.show).toHaveBeenCalledWith(`${getSecondaryActionBadge()}: RETURN EGO BOLT`, guide.player.position, "info");
    expect(guide.counterTraining.readout()).toEqual(lesson);
    expect(gameState.mode).toBe("explore");
    expect(gameState.sceneProgress.guideCitationCounterTrained).toBeUndefined();
  });
  it("reveals the earned fragment once without a blocking dialog or delayed award", () => {
    const guide = scene();
    const reward = { y: 132, setName: vi.fn().mockReturnThis(), setDepth: vi.fn().mockReturnThis(), destroy: vi.fn() };
    const image = vi.fn().mockReturnValue(reward), tween = vi.fn(), show = vi.fn();
    Object.assign(guide, { hasCounterTraining: true, add: { image }, tweens: { add: tween }, dialog: { show } });
    const points = gameState.documentPoints;
    guide.takeFragment();
    expect(gameState.volumeFragments).toContain("Front Matter Fragment");
    expect(gameState.documentPoints).toBe(points + 10);
    expect(image).toHaveBeenCalledWith(160, 132, "volume-fragment");
    expect(show).not.toHaveBeenCalled();
    expect(guide.syncStagePresentation).toHaveBeenCalledOnce();
    reward.y = 123.6;
    tween.mock.calls[0][0].onUpdate();
    expect(reward.y).toBe(124);
    guide.takeFragment();
    expect(image).toHaveBeenCalledOnce();
    expect(gameState.documentPoints).toBe(points + 10);
    tween.mock.calls[1][0].onComplete();
    expect(reward.destroy).toHaveBeenCalledOnce();
  });
  it("points to the first tool without opening a dialogue or awarding it", () => {
    const guide = scene() as unknown as { talkColleague(): void; toast: { show: ReturnType<typeof vi.fn> } };
    const show = vi.fn();
    Object.assign(guide, { hasStamp: false, dialog: { show } });
    const inventory = [...gameState.inventory];
    const points = gameState.documentPoints;
    guide.talkColleague();
    expect(show).not.toHaveBeenCalled();
    expect(guide.toast.show).toHaveBeenCalledWith("TAKE THE GOLD STAMP", expect.any(Object), "info");
    expect(gameState.latestMessage).toContain("Practice cannot hurt you");
    expect(gameState.inventory).toEqual(inventory);
    expect(gameState.documentPoints).toBe(points);
  });
  it("schedules one exit even when the earned gate is activated repeatedly", () => {
    const guide = scene();
    const delayedCall = vi.fn();
    Object.assign(guide, { hasFragment: true, time: { delayedCall }, setLessonPaused: vi.fn() });
    guide.openGate(); guide.openGate(); guide.openGate();
    expect(delayedCall).toHaveBeenCalledOnce();
  });
  it.each(["red_pencil", "citation_stamp"])("rejects %s without the owned active Citation Stamp counter", (tool) => {
    const guide = scene();
    if (tool === "red_pencil") addProcessItem("red_pencil");
    guide.player.combatReadout.weapon.tool = tool;
    advance(guide, GUIDE_COUNTER.retryMs + GUIDE_COUNTER.chargeMs);
    const bolt = guide.counterTraining.readout().bolt!;
    guide.player.activeActionHitbox = { x: bolt.x - 8, y: bolt.y - 8, width: 16, height: 16 };
    guide.updateCitationCounterTraining(10);
    expect(guide.counterTraining.readout().phase).toBe("incoming");
    expect(gameState.sceneProgress.guideCitationCounterTrained).toBeUndefined();
  });

  it("does not release the fragment for an interaction or idle weapon", () => {
    const guide = scene();
    addProcessItem("citation_stamp");
    guide.takeFragment();
    advance(guide, 8000);
    expect(guide.hasFragment).toBe(false);
    expect(gameState.volumeFragments).not.toContain("Front Matter Fragment");
    expect(gameState.sceneProgress.guideCitationCounterTrained).toBeUndefined();
    expect(saveGameNow).not.toHaveBeenCalled();
  });

  it("saves the actual returned impact once, without damage, points, or boss-defeat credit", () => {
    const guide = scene();
    addProcessItem("citation_stamp");
    const before = structuredClone(gameState);
    advance(guide, GUIDE_COUNTER.retryMs + GUIDE_COUNTER.chargeMs + 900);
    const bolt = guide.counterTraining.readout().bolt!;
    guide.player.activeActionHitbox = { x: bolt.x - 8, y: bolt.y - 8, width: 16, height: 16 };
    guide.updateCitationCounterTraining(10);
    expect(guide.counterTraining.readout().phase).toBe("returned");
    expect(guide.practiceBolt.setTintFill).toHaveBeenCalled();
    expect(gameState.sceneProgress.guideCitationCounterTrained).toBeUndefined();
    guide.player.activeActionHitbox = null;
    advance(guide, 3000);
    expect(gameState.sceneProgress.guideCitationCounterTrained).toBe(1);
    expect(saveGameNow).toHaveBeenCalledOnce();
    expect(guide.syncStagePresentation).toHaveBeenCalledOnce();
    expect(gameState.reliability).toBe(before.reliability);
    expect(gameState.documentPoints).toBe(before.documentPoints);
    expect(gameState.inventory).toEqual(before.inventory);
    expect(gameState.completionStats).toEqual(before.completionStats);
  });
});
