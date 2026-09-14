import { beforeEach, describe, expect, it, vi } from "vitest";
import { GameplayMapScene } from "./GameplayMapScene";
import { UIScene } from "./UIScene";
import { addProcessItem, equipProcessItem, gameState, resetGameState, setSceneState } from "../game/state";
import { QUEST_BAND_LAYOUT, clampQuestBandText } from "./questBandLayout";
import { getSecondaryActionBadge } from "../input/InputState";

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
  it.each([false, true])("labels dialogue with the actual action buttons (touch=%s)", touch => {
    vi.stubGlobal("window", {});
    vi.stubGlobal("navigator", { maxTouchPoints: touch ? 5 : 0 });
    try {
      const hint = vi.fn();
      const scene = new GameplayMapScene();
      Object.assign(scene, { dialogPages: ["Follow the source trail."], dialogIndex: 0,
        dialogSpeaker: "Archivist", hintText: { setText: hint },
        dialogSpeakerText: { setText: vi.fn() }, dialogBodyText: { setText: vi.fn() } });
      (scene as unknown as { renderMapDialog(): void }).renderMapDialog();
      expect(hint).toHaveBeenCalledWith(touch ? "A NEXT  B CLOSE" : "Z NEXT  X CLOSE");
      expect(gameState.activeDialog?.text).toBe("Follow the source trail.");
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it.each([false, true])("uses available controls in exploration hints (touch=%s)", touch => {
    vi.stubGlobal("window", {});
    vi.stubGlobal("navigator", { maxTouchPoints: touch ? 5 : 0 });
    try {
      const scene = new GameplayMapScene() as unknown as { explorationHint(): string; explorationHintY(): number };
      expect(scene.explorationHint()).toBe(touch ? "A INTERACT  USE WORLD EXIT" : "Z INTERACT  ESC WORLD MAP");
      expect(scene.explorationHintY()).toBe(touch ? 232 : 211);
    } finally {
      vi.unstubAllGlobals();
    }
  });

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
  it("requires an owned combat tool before starting the map's swing", () => {
    const startAction = vi.fn(() => true);
    const scene = new GameplayMapScene();
    Object.assign(scene, { player: { startAction,
      combatReadout: { state: "idle", weapon: { tool: "citation_stamp", label: "Citation Stamp" } } } });
    const swing = () => (scene as unknown as { startEquippedSwing(): void }).startEquippedSwing();
    for (const tool of [null, "clearance_token", "citation_stamp"] as const) {
      gameState.equippedProcessItem = tool;
      swing();
      expect(startAction).not.toHaveBeenCalled();
      expect(gameState.objective).toBe("EQUIP AN OWNED TOOL");
    }
    addProcessItem("citation_stamp");
    equipProcessItem("citation_stamp");
    swing();
    expect(startAction).toHaveBeenCalledExactlyOnceWith("citation_stamp");
  });

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
  it("replaces combat advice only after the final gate is cleared", () => {
    const ui = new UIScene() as unknown as { gameplayCombatCue(): { text: string } | null };
    gameState.visibleThreats = [{ label: "DANN-E ROOM GATE", x: 128, y: 32,
      roomClear: { roomId: "nara_stacks", defeated: 2, required: 2, cleared: true } }];
    expect(ui.gameplayCombatCue()?.text).toBe("EXPLORE OPEN ROUTES");
    gameState.nearestInteractable = "Catalog Desk";
    expect(ui.gameplayCombatCue()).toBeNull();
    gameState.nearestInteractable = null;
    gameState.visibleThreats[0].roomClear!.cleared = false;
    expect(ui.gameplayCombatCue()).toBeNull();
  });

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
    assertVisible(weakness === "review_folder" ? "FOLDER: ARCHIVE B2"
      : weakness === "red_pencil" ? "PENCIL: EDITOR E1" : "STAMP: GUIDE CAVERN");
    addProcessItem(weakness);
    gameState.equippedProcessItem = null;
    assertVisible(`EQUIP ${name}`);
    const actionHint = () => (scene as unknown as { currentDanneCombatCue(): { actionHint: string } }).currentDanneCombatCue().actionHint;
    const short = weakness === "citation_stamp" ? "STAMP" : weakness === "red_pencil" ? "PENCIL" : "FOLDER";
    expect(actionHint()).toBe(`TOOLS: EQUIP ${short}`);
    equipProcessItem(weakness);
    expect(actionHint()).toBe(`${getSecondaryActionBadge()} USE ${short}`);
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

  it.each(["nara_stacks", "capitol_hill"])("keeps only the %s world-map exit available until the room is clear", mapKey => {
    const scene = new GameplayMapScene();
    const exit = { id: "world_exit", target: { scene: "WorldMapScene" } };
    const vault = { id: "vault_a_route", target: { scene: "GameplayMapScene" } };
    const reward = { id: "catalog" };
    Object.assign(scene, { mapKey, doors: [exit, vault], interactables: [exit, vault, reward] });
    const allowed = (scene as unknown as { availableCombatInteractables(locked: boolean): unknown[] }).availableCombatInteractables.bind(scene);
    expect(allowed(true)).toEqual([exit]);
    expect(allowed(false)).toEqual([exit, vault, reward]);
    Object.assign(scene, { mapKey: "black_vault" });
    expect(allowed(true)).toEqual([]);
  });
});
