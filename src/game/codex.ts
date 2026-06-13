import { ITEM_REGISTRY } from "./constants";
import { DANNE_ITEM_CATALOG } from "./danneItemCatalog";
import { DANNE_RUNTIME_SPRITE_ASSETS, DANNE_VARIANT_ASSETS } from "./danneAtlas";
import { SNES_ANTAGONIST_ASSETS } from "./snesAtlas";

export type CodexCategory = "Enemies" | "NPCs" | "DANN-E Variants" | "Items";

export interface CodexEntry {
  id: string;
  category: CodexCategory;
  displayName: string;
  artKey?: string;
  spriteSheet?: boolean;
  startsUnlocked?: boolean;
  lore: string;
}

export interface CodexEntryReadout extends CodexEntry {
  unlocked: boolean;
}

export const CODEX_STORAGE_KEY = "ruby-rule.codexUnlocks";

const runtimeSpriteKey = (entityId: string) =>
  DANNE_RUNTIME_SPRITE_ASSETS.find((asset) => asset.entityId === entityId)?.key;

const DANNE_ENEMY_ENTRIES: readonly CodexEntry[] = [
  {
    id: "enemy-redactor-drone",
    category: "Enemies",
    displayName: "Redactor Drone",
    artKey: runtimeSpriteKey("redactor-drone"),
    spriteSheet: true,
    lore: "A hovering automated redaction unit. It drops black-bar stamps that linger before fading."
  },
  {
    id: "enemy-censorship-wraith",
    category: "Enemies",
    displayName: "Censorship Wraith",
    artKey: runtimeSpriteKey("censorship-wraith"),
    spriteSheet: true,
    lore: "A slow vault threat with an ink-sweep attack. Keep spacing and wait for the review window."
  },
  ...SNES_ANTAGONIST_ASSETS.map((asset) => ({
    id: `enemy-${asset.id.replace(/_/g, "-")}`,
    category: "Enemies" as const,
    displayName: asset.displayName,
    artKey: asset.key,
    lore: `${asset.behavior}. Counterplay: ${asset.counterplay}.`
  })),
  {
    id: "enemy-danne-boss",
    category: "Enemies",
    displayName: "DANN-E",
    artKey: "danne-boss-combat",
    spriteSheet: true,
    lore: "Document Annihilating Neural Network Executable. Final boss; fires ego bolts and boasts between phases."
  }
];

const NPC_ENTRIES: readonly CodexEntry[] = [
  {
    id: "npc-historian",
    category: "NPCs",
    displayName: "Historian",
    artKey: "danne-portrait-historian",
    startsUnlocked: true,
    lore: "A colleague who points the player back to provenance, source order, and human review."
  },
  {
    id: "npc-declass-coordinator",
    category: "NPCs",
    displayName: "Declass Coordinator",
    artKey: "danne-portrait-declass-coordinator",
    startsUnlocked: true,
    lore: "Tracks declassification routes, referrals, and ClassNet/OpenNet handoffs."
  },
  {
    id: "npc-senior-archivist",
    category: "NPCs",
    displayName: "Senior Archivist",
    artKey: "danne-portrait-archivist",
    startsUnlocked: true,
    lore: "Represents archival expertise without creating a rank advantage over the player."
  },
  {
    id: "npc-senator",
    category: "NPCs",
    displayName: "Senator",
    artKey: "danne-portrait-senator",
    lore: "Appears in hearing-room records as non-partisan set dressing for public testimony."
  },
  {
    id: "npc-junior-compiler",
    category: "NPCs",
    displayName: "Junior Compiler",
    artKey: runtimeSpriteKey("junior-compiler"),
    spriteSheet: true,
    lore: "A production colleague who checks inbox, cart, and terminal status before issuing the declass key."
  },
  {
    id: "npc-marine-guard",
    category: "NPCs",
    displayName: "Marine Guard",
    artKey: runtimeSpriteKey("marine-guard"),
    spriteSheet: true,
    lore: "Guards classified doors until the Master Declass Key proves approved access."
  },
  {
    id: "npc-statechat-terminal",
    category: "NPCs",
    displayName: "StateChat Terminal",
    artKey: "terminal-panel",
    startsUnlocked: true,
    lore: "A terminal-only review tool. It can flag mechanical issues, but it does not decide provenance or meaning."
  }
];

const DANNE_VARIANT_ENTRIES: readonly CodexEntry[] = DANNE_VARIANT_ASSETS.map((asset) => ({
  id: asset.variantId,
  category: "DANN-E Variants" as const,
  displayName: asset.displayName,
  artKey: asset.key,
  lore: `DANN-E ${asset.phase} form. Locked until encountered in the warning, vault, or boss sequence.`
}));

const ITEM_ENTRIES: readonly CodexEntry[] = [
  ...DANNE_ITEM_CATALOG.map((item) => ({
    id: `item-${item.id}`,
    category: "Items" as const,
    displayName: item.displayName,
    artKey: item.key,
    lore: item.description
  })),
  ...ITEM_REGISTRY.map((item) => ({
    id: `item-${item.id}`,
    category: "Items" as const,
    displayName: item.displayName,
    artKey: item.texture,
    startsUnlocked: true,
    lore: `${item.zeldaFunction}. FRUS meaning: ${item.frusMeaning}.`
  }))
];

export const CODEX_CATEGORIES: readonly CodexCategory[] = ["Enemies", "NPCs", "DANN-E Variants", "Items"];

export const CODEX_ENTRIES: readonly CodexEntry[] = [
  ...DANNE_ENEMY_ENTRIES,
  ...NPC_ENTRIES,
  ...DANNE_VARIANT_ENTRIES,
  ...ITEM_ENTRIES
];

function storageAvailable() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function readUnlocks() {
  if (!storageAvailable()) return new Set<string>();
  try {
    const raw = window.localStorage.getItem(CODEX_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) as unknown : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : []);
  } catch {
    return new Set<string>();
  }
}

function writeUnlocks(unlocks: Set<string>) {
  if (!storageAvailable()) return;
  window.localStorage.setItem(CODEX_STORAGE_KEY, JSON.stringify([...unlocks].sort()));
}

export function isCodexEntryUnlocked(entry: CodexEntry) {
  if (entry.startsUnlocked) return true;
  return readUnlocks().has(entry.id);
}

export function unlockCodexEntry(entryId: string) {
  const unlocks = readUnlocks();
  const before = unlocks.size;
  unlocks.add(entryId);
  if (unlocks.size !== before) {
    writeUnlocks(unlocks);
    return true;
  }
  return false;
}

export function getCodexEntries(category?: CodexCategory): CodexEntryReadout[] {
  return CODEX_ENTRIES
    .filter((entry) => !category || entry.category === category)
    .map((entry) => ({ ...entry, unlocked: isCodexEntryUnlocked(entry) }));
}

export function getCodexReadout() {
  const entries = getCodexEntries();
  return {
    storageKey: CODEX_STORAGE_KEY,
    unlocked: entries.filter((entry) => entry.unlocked).length,
    total: entries.length,
    categories: CODEX_CATEGORIES.map((category) => {
      const categoryEntries = entries.filter((entry) => entry.category === category);
      return {
        category,
        unlocked: categoryEntries.filter((entry) => entry.unlocked).length,
        total: categoryEntries.length
      };
    }),
    entries: entries.map((entry) => ({
      id: entry.id,
      category: entry.category,
      displayName: entry.unlocked ? entry.displayName : "???",
      unlocked: entry.unlocked
    }))
  };
}
