import { beforeEach, describe, expect, it, vi } from "vitest";
import { GameplayMapScene } from "./GameplayMapScene";
import { UIScene } from "./UIScene";
import { gameState, resetGameState, setSceneState } from "../game/state";
import { QUEST_BAND_LAYOUT, clampQuestBandText } from "./questBandLayout";

vi.mock("phaser", () => ({ default: {
  Scene: class {}, GameObjects: { Sprite: class {} },
  Geom: { Rectangle: class {} }
} }));
vi.mock("../systems/roomClear", () => ({
  isRoomCleared: () => false, applyRoomClearGate: () => ({ cleared: false })
}));

beforeEach(() => {
  resetGameState();
  setSceneState("GameplayMapScene", "explore", "CLEAR THE ROOM");
});

describe("wrong-tool combat feedback", () => {
  it.each(["citation_stamp", "red_pencil", "review_folder"] as const)("keeps %s visible in the compact HUD", weakness => {
    const scene = new GameplayMapScene();
    Object.assign(scene, {
      time: { now: 1000 }, danneRoomId: "nara_stacks",
      player: { position: { x: 100, y: 100 }, activeActionHitbox: null, actionId: 1 },
      danneEnemies: [{ defeated: false, weakness,
        updateEnemy: () => ({ projectileHit: false, contactHit: false }),
        tryPlayerToolHit: () => "wrong-tool"
      }]
    });
    (scene as unknown as { updateDanneEncounter(delta: number): void }).updateDanneEncounter(16);
    const compact = (new UIScene() as unknown as { compactObjective(scene: string): string }).compactObjective("GameplayMapScene");
    const expected = `EQUIP ${weakness.replace(/_/g, " ").toUpperCase()}`;
    expect(gameState.objective).toBe(expected);
    expect(clampQuestBandText(compact, QUEST_BAND_LAYOUT.objective.maxChars)).toBe(expected);
    expect(gameState.mode).toBe("explore");
  });
});
