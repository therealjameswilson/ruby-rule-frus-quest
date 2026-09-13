import { beforeEach, describe, expect, it, vi } from "vitest";
import { UIScene } from "./UIScene";
import { addProcessItem, equipProcessItem, gameState, resetGameState, setSceneState } from "../game/state";
import { getSecondaryActionBadge } from "../input/InputState";
import { clampQuestBandText, QUEST_BAND_LAYOUT } from "./questBandLayout";

vi.mock("phaser", () => ({ default: { Scene: class {}, GameObjects: { Sprite: class {} } } }));
const cue = () => (new UIScene() as unknown as { gameplayCombatCue(): { text: string; badge: string } | null }).gameplayCombatCue();

beforeEach(() => {
  resetGameState(); setSceneState("GameplayMapScene", "explore", "FIND REVIEW FOLDER");
  gameState.visibleThreats = [{ label: "Mark I", x: 80, y: 100, hp: 2, weakness: "review_folder", enemyState: "patrol" }];
});

describe("encounter action guidance", () => {
  it("advises evasion when the required tool is absent", () => {
    expect(cue()).toEqual({ text: "RETREAT; NEED FOLDER", badge: "!" });
  });
  it("distinguishes owning a counter from equipping it", () => {
    addProcessItem("review_folder"); gameState.equippedProcessItem = null;
    expect(cue()).toEqual({ text: "TOOLS: EQUIP FOLDER", badge: "!" });
    equipProcessItem("review_folder");
    expect(cue()).toEqual({ text: "COUNTER WITH FOLDER", badge: getSecondaryActionBadge() });
    expect(clampQuestBandText(cue()!.text, QUEST_BAND_LAYOUT.actionCue.maxChars)).toBe(cue()!.text);
  });
  it("follows the nearest living enemy instead of roster order", () => {
    gameState.visibleThreats.push({ label: "Cloud", x: 128, y: 160, hp: 2, weakness: "citation_stamp", enemyState: "patrol" });
    expect(cue()?.text).toBe("RETREAT; NEED STAMP");
    gameState.visibleThreats[1].enemyState = "defeated";
    expect(cue()?.text).toBe("RETREAT; NEED FOLDER");
  });
  it.each(["dialog", "choice", "pause"] as const)("stays out of %s prompts", mode => {
    gameState.mode = mode; expect(cue()).toBeNull();
  });
  it("preserves nearby interactions and other scene guidance", () => {
    gameState.nearestInteractable = "Archivist"; expect(cue()).toBeNull();
    gameState.nearestInteractable = null;
    setSceneState("ArchiveScene", "explore", "READ NOTE"); expect(cue()).toBeNull();
  });
  it("disappears after the room is cleared", () => {
    gameState.visibleThreats[0].hp = 0; expect(cue()).toBeNull();
  });
});
