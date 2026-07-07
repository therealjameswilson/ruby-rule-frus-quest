export type DanneDifficultyTier = "standard" | "veteran";

export interface DanneDifficultyProfile {
  tier: DanneDifficultyTier;
  label: string;
  hpMultiplier: number;
  speedMultiplier: number;
  cooldownMultiplier: number;
}

export interface NewGamePlusMeta {
  ngPlusUnlocked: boolean;
  volumesCompleted: number;
  lastCompletedAt: string | null;
}

const NEW_GAME_PLUS_META_KEY = "ruby-rule.newGamePlus";

const DEFAULT_META: NewGamePlusMeta = {
  ngPlusUnlocked: false,
  volumesCompleted: 0,
  lastCompletedAt: null
};

export const DANNE_DIFFICULTY_PROFILES: Record<DanneDifficultyTier, DanneDifficultyProfile> = {
  standard: {
    tier: "standard",
    label: "Standard",
    hpMultiplier: 1,
    speedMultiplier: 1,
    cooldownMultiplier: 1
  },
  veteran: {
    tier: "veteran",
    label: "Veteran",
    hpMultiplier: 1.3,
    speedMultiplier: 1.18,
    cooldownMultiplier: 0.82
  }
};

function browserStorage() {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function normalizeMeta(value: Partial<NewGamePlusMeta> | null | undefined): NewGamePlusMeta {
  const volumesCompleted = Math.max(0, Math.floor(Number(value?.volumesCompleted ?? 0)));
  return {
    ngPlusUnlocked: Boolean(value?.ngPlusUnlocked) || volumesCompleted > 0,
    volumesCompleted,
    lastCompletedAt: typeof value?.lastCompletedAt === "string" ? value.lastCompletedAt : null
  };
}

export function getNewGamePlusMeta(): NewGamePlusMeta {
  const storage = browserStorage();
  if (!storage) return { ...DEFAULT_META };
  try {
    const raw = storage.getItem(NEW_GAME_PLUS_META_KEY);
    if (!raw) return { ...DEFAULT_META };
    return normalizeMeta(JSON.parse(raw) as Partial<NewGamePlusMeta>);
  } catch {
    return { ...DEFAULT_META };
  }
}

export function persistNewGamePlusMeta(meta: Partial<NewGamePlusMeta>): NewGamePlusMeta {
  const next = normalizeMeta(meta);
  const storage = browserStorage();
  if (storage) {
    try {
      storage.setItem(NEW_GAME_PLUS_META_KEY, JSON.stringify(next));
    } catch {
      // A failed metadata write should not block an ending sequence.
    }
  }
  return next;
}

export function recordNewGamePlusCompletion(currentRunVolumesCompleted: number): NewGamePlusMeta {
  const current = getNewGamePlusMeta();
  return persistNewGamePlusMeta({
    ngPlusUnlocked: true,
    volumesCompleted: Math.max(current.volumesCompleted, currentRunVolumesCompleted) + 1,
    lastCompletedAt: new Date().toISOString()
  });
}

export function getDanneDifficultyProfile(tier: DanneDifficultyTier): DanneDifficultyProfile {
  return DANNE_DIFFICULTY_PROFILES[tier] ?? DANNE_DIFFICULTY_PROFILES.standard;
}
