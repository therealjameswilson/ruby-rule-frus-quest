import { beforeEach, describe, expect, it, vi } from "vitest";
import { GameplayMapScene } from "./GameplayMapScene";
import { UIScene } from "./UIScene";
import { addProcessItem, equipProcessItem, gameState, resetGameState, setSceneState } from "../game/state";
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
      player: { position: { x: 100, y: 100 }, activeActionHitbox: null, actionId: 1,
        combatReadout: { weapon: { tool: "citation_stamp" } } },
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

describe("swing tool identity", () => {
  it.each(["citation_stamp", "red_pencil", "review_folder"] as const)("resolves the active %s swing, not the newly equipped item", tool => {
    addProcessItem("citation_stamp");
    addProcessItem("red_pencil");
    equipProcessItem(tool === "red_pencil" ? "citation_stamp" : "red_pencil");
    const hitbox = { x: 112, y: 92, width: 20, height: 16 };
    const tryPlayerToolHit = vi.fn(() => "miss");
    const scene = new GameplayMapScene();
    Object.assign(scene, {
      time: { now: 1000 }, danneRoomId: "nara_stacks",
      player: { position: { x: 100, y: 100 }, activeActionHitbox: hitbox, actionId: 8,
        combatReadout: { weapon: { tool } } },
      danneEnemies: [{ defeated: false, updateEnemy: () => ({ projectileHit: false, contactHit: false }), tryPlayerToolHit }]
    });
    (scene as unknown as { updateDanneEncounter(delta: number): void }).updateDanneEncounter(16);
    expect(tryPlayerToolHit).toHaveBeenCalledWith(hitbox, tool, { x: 100, y: 100 }, 8);
    expect(gameState.equippedProcessItem).not.toBe(tool);
  });
});

describe("encounter readiness cues", () => {
  it("names the upcoming review wave without clipping", () => {
    const scene = new GameplayMapScene();
    Object.assign(scene, {
      danneRoomId: "nara_stacks", danneEnemies: [],
      danneWaveTransition: { pending: true }, danneWaves: { currentWave: 1, totalWaves: 2 }
    });
    const cue = (scene as unknown as { currentDanneCombatCue(): { objective: string } }).currentDanneCombatCue();
    expect(clampQuestBandText(cue.objective, QUEST_BAND_LAYOUT.objective.maxChars)).toBe("NEXT WAVE 2/2");
  });

  it.each(["citation_stamp", "red_pencil", "review_folder"] as const)("keeps find, equip and progress for %s on screen", weakness => {
    const scene = new GameplayMapScene();
    Object.assign(scene, {
      danneRoomId: "nara_stacks", player: { position: { x: 100, y: 100 } },
      danneEnemies: [{ defeated: false, readout: () => ({ weakness, label: "DANN-E Mark I" }) }],
      currentDanneRoomStatus: () => ({ defeatedEnemyCount: 1, requiredEnemyCount: 2 })
    });
    const cue = () => (scene as unknown as { currentDanneCombatCue(): { objective: string } }).currentDanneCombatCue().objective;
    const assertVisible = (expected: string) => {
      expect(cue()).toBe(expected);
      expect(clampQuestBandText(cue(), QUEST_BAND_LAYOUT.objective.maxChars)).toBe(expected);
    };
    const name = weakness.replace(/_/g, " ").toUpperCase();
    assertVisible(`FIND ${name}`);
    addProcessItem(weakness);
    gameState.equippedProcessItem = null;
    assertVisible(`EQUIP ${name}`);
    equipProcessItem(weakness);
    const short = weakness === "citation_stamp" ? "STAMP" : weakness === "red_pencil" ? "PENCIL" : "FOLDER";
    assertVisible(`${short}: 1/2 CLEARED`);
  });
});

describe("NARA combat retreat", () => {
  it("releases the previous doorway lock when the scene is re-entered", () => {
    const scene = new GameplayMapScene();
    Object.assign(scene, { routeTransitionLocked: true });
    vi.stubGlobal("window", { location: { search: "" } });
    try {
      scene.init({ mapKey: "nara_stacks" });
      expect((scene as unknown as { routeTransitionLocked: boolean }).routeTransitionLocked).toBe(false);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("keeps only the world-map exit available until the room is clear", () => {
    const scene = new GameplayMapScene();
    const exit = { id: "world_exit", target: { scene: "WorldMapScene" } };
    const vault = { id: "vault_a_route", target: { scene: "GameplayMapScene" } };
    const reward = { id: "catalog" };
    Object.assign(scene, { mapKey: "nara_stacks", doors: [exit, vault], interactables: [exit, vault, reward] });
    const allowed = (scene as unknown as { availableCombatInteractables(locked: boolean): unknown[] }).availableCombatInteractables.bind(scene);
    expect(allowed(true)).toEqual([exit]);
    expect(allowed(false)).toEqual([exit, vault, reward]);
    Object.assign(scene, { mapKey: "black_vault" });
    expect(allowed(true)).toEqual([]);
  });
});
