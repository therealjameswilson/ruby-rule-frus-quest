import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createGameSaveData, gameState, resetGameState, SAVE_SCHEMA_VERSION, setSceneState } from "../game/state";
import { getSavedGameSummary, loadSavedGame, readSavedGame, saveGameNow } from "./save";

function createStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); }
  };
}

beforeEach(() => {
  vi.stubGlobal("window", { localStorage: createStorage(), sessionStorage: createStorage() });
  resetGameState();
  setSceneState("ArchiveScene", "explore", "CHECK REPO");
});

afterEach(() => {
  resetGameState();
  vi.unstubAllGlobals();
});

describe("browser save storage", () => {
  it("offers Continue for the schema emitted by the current writer", () => {
    gameState.player = { x: 128, y: 158 };
    gameState.sceneProgress.archiveSourceNoteCollected = 1;
    gameState.sceneProgress.archiveSourceNoteRouted = 1;
    gameState.sceneProgress.sourceNoteProvenanceStep = 0;
    expect(saveGameNow()).toBe(true);
    expect(readSavedGame()?.version).toBe(SAVE_SCHEMA_VERSION);
    expect(getSavedGameSummary()).toMatchObject({ currentScene: "ArchiveScene", player: { x: 128, y: 158 } });

    resetGameState();
    expect(loadSavedGame()).toBe("ArchiveScene");
    expect(gameState.sceneProgress.archiveSourceNoteRouted).toBe(1);
    expect(gameState.sceneProgress.sourceNoteProvenanceStep).toBe(0);
    expect(gameState.player).toEqual({ x: 128, y: 158 });
  });

  it("preserves the carried note through the actual storage boundary", () => {
    gameState.heldItem = "Source Note 47";
    expect(saveGameNow()).toBe(true);
    resetGameState();
    expect(loadSavedGame()).toBe("ArchiveScene");
    expect(gameState.heldItem).toBe("Source Note 47");
  });

  it.each([0, 1])("still accepts legacy schema %s", (version) => {
    window.localStorage.setItem("rubyRuleFrusQuestSave", JSON.stringify({ ...createGameSaveData(), version }));
    expect(readSavedGame()?.version).toBe(version);
    expect(loadSavedGame()).toBe("ArchiveScene");
  });

  it.each([SAVE_SCHEMA_VERSION + 1, -1, 0.5, "invalid"])("rejects unsupported schema %s without overwriting it", (version) => {
    const raw = JSON.stringify({ ...createGameSaveData(), version });
    window.localStorage.setItem("rubyRuleFrusQuestSave", raw);
    expect(readSavedGame()).toBeNull();
    expect(window.localStorage.getItem("rubyRuleFrusQuestSave")).toBe(raw);
  });
});
