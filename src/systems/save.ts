import {
  addGameStateChangeListener,
  createGameSaveData,
  gameState,
  getGameSaveSummary,
  isSaveableGameScene,
  restoreGameSaveData,
  type GameSaveData,
  type GameSaveSummary
} from "../game/state";

const SAVE_KEY = "rubyRuleFrusQuestSave";
const SAVE_INTERVAL_MS = 30000;

type StorageKind = "localStorage" | "sessionStorage";
type SaveReason = "scene" | "interval" | "visibility" | "pagehide" | "manual";

let installed = false;
let intervalId: number | undefined;
let storageKind: StorageKind = "localStorage";
let lastSaveResult: { ok: boolean; reason: SaveReason; storage: StorageKind; savedAt: string | null; warning?: string } = {
  ok: false,
  reason: "manual",
  storage: "localStorage",
  savedAt: null
};

function storage(kind: StorageKind) {
  return kind === "localStorage" ? window.localStorage : window.sessionStorage;
}

function readStorage(kind: StorageKind) {
  try {
    return storage(kind).getItem(SAVE_KEY);
  } catch {
    return null;
  }
}

function removeStorage(kind: StorageKind) {
  try {
    storage(kind).removeItem(SAVE_KEY);
  } catch {
    // Storage may be unavailable in strict privacy modes.
  }
}

function parseSave(raw: string | null): GameSaveData | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<GameSaveData>;
    return migrateSaveData(parsed);
  } catch {
    return null;
  }
}

function migrateSaveData(parsed: Partial<GameSaveData>): GameSaveData | null {
  if (!parsed || typeof parsed !== "object" || !parsed.state) return null;
  const version = Number(parsed.version ?? 0);
  if (version > 1) return null;
  return {
    version: 1,
    savedAt: parsed.savedAt ?? new Date().toISOString(),
    state: parsed.state as GameSaveData["state"]
  };
}

function writeSave(raw: string, reason: SaveReason, save: GameSaveData) {
  try {
    storage("localStorage").setItem(SAVE_KEY, raw);
    storageKind = "localStorage";
    lastSaveResult = { ok: true, reason, storage: storageKind, savedAt: save.savedAt };
    return true;
  } catch (error) {
    try {
      storage("sessionStorage").setItem(SAVE_KEY, raw);
      storageKind = "sessionStorage";
      lastSaveResult = {
        ok: true,
        reason,
        storage: storageKind,
        savedAt: save.savedAt,
        warning: "localStorage rejected the save; sessionStorage fallback is active"
      };
      console.warn("[Ruby Rule] localStorage save failed; using sessionStorage fallback.", error);
      return true;
    } catch (fallbackError) {
      lastSaveResult = {
        ok: false,
        reason,
        storage: storageKind,
        savedAt: null,
        warning: "storage quota or browser privacy settings blocked saving"
      };
      console.warn("[Ruby Rule] save failed in both localStorage and sessionStorage.", fallbackError);
      return false;
    }
  }
}

export function readSavedGame() {
  if (typeof window === "undefined") return null;
  const local = parseSave(readStorage("localStorage"));
  if (local) {
    storageKind = "localStorage";
    return local;
  }
  const session = parseSave(readStorage("sessionStorage"));
  if (session) {
    storageKind = "sessionStorage";
    return session;
  }
  return null;
}

export function getSavedGameSummary(): GameSaveSummary | null {
  const save = readSavedGame();
  return save ? getGameSaveSummary(save) : null;
}

export function hasSavedGame() {
  return Boolean(readSavedGame());
}

export function saveGameNow(reason: SaveReason = "manual") {
  if (typeof window === "undefined" || !isSaveableGameScene()) return false;
  const save = createGameSaveData();
  const raw = JSON.stringify(save);
  return writeSave(raw, reason, save);
}

export function loadSavedGame() {
  const save = readSavedGame();
  if (!save) return null;
  return restoreGameSaveData(save);
}

export function clearSavedGame() {
  if (typeof window === "undefined") return;
  removeStorage("localStorage");
  removeStorage("sessionStorage");
  lastSaveResult = {
    ok: false,
    reason: "manual",
    storage: storageKind,
    savedAt: null
  };
}

export function getSaveDebugState() {
  const summary = getSavedGameSummary();
  return {
    key: SAVE_KEY,
    hasSave: Boolean(summary),
    summary,
    storage: storageKind,
    lastSaveResult
  };
}

export function installAutosaveLifecycle() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  addGameStateChangeListener((reason) => {
    if (reason === "scene") window.setTimeout(() => saveGameNow("scene"), 0);
  });
  intervalId = window.setInterval(() => {
    if (gameState.mode === "explore" || gameState.mode === "ending") saveGameNow("interval");
  }, SAVE_INTERVAL_MS);
  window.addEventListener("pagehide", () => saveGameNow("pagehide"));
}

export function uninstallAutosaveLifecycleForTests() {
  if (intervalId !== undefined) window.clearInterval(intervalId);
  intervalId = undefined;
  installed = false;
}
