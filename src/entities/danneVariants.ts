import type { ProcessItemId, ProcessStampId } from "../game/constants";
import { DANNE_VARIANT_ASSETS, type DanneVariantPhase } from "../game/danneAtlas";

export type DanneEnemyAiKind = "patrol" | "chase" | "turret";
export type DanneEnemyVariantId = (typeof DANNE_VARIANT_ASSETS)[number]["variantId"];

export interface DanneEnemyLoot {
  documentPoints?: number;
  processStamp?: ProcessStampId;
  volumeFragment?: string;
}

export interface DanneEnemyVariantConfig {
  id: DanneEnemyVariantId;
  displayName: string;
  textureKey: string;
  codexEntryId: string;
  phase: DanneVariantPhase;
  maxHp: number;
  speed: number;
  aggroRadius: number;
  weakness: ProcessItemId;
  ai: DanneEnemyAiKind;
  scale: number;
  body: {
    width: number;
    height: number;
    offsetX: number;
    offsetY: number;
  };
  loot: DanneEnemyLoot;
  behavior: string;
  defeatMethod: string;
}

function variantAsset(variantId: DanneEnemyVariantId) {
  const asset = DANNE_VARIANT_ASSETS.find((candidate) => candidate.variantId === variantId);
  if (!asset) throw new Error(`Missing DANN-E variant asset: ${variantId}`);
  return asset;
}

function config(
  id: DanneEnemyVariantId,
  values: Omit<DanneEnemyVariantConfig, "id" | "displayName" | "textureKey" | "phase">
): DanneEnemyVariantConfig {
  const asset = variantAsset(id);
  return {
    id,
    displayName: asset.displayName,
    textureKey: asset.key,
    phase: asset.phase,
    ...values
  };
}

export const DANNE_ENEMY_VARIANTS = {
  "danne-prime-humanoid": config("danne-prime-humanoid", {
    codexEntryId: "danne-prime-humanoid",
    maxHp: 2,
    speed: 18,
    aggroRadius: 64,
    weakness: "review_folder",
    ai: "chase",
    scale: 0.03,
    body: { width: 18, height: 20, offsetX: -9, offsetY: -10 },
    loot: { documentPoints: 4 },
    behavior: "chases the player with false-human shortcut pressure",
    defeatMethod: "Use the Review Folder to force a documented human decision."
  }),
  "danne-mark-i-prototype": config("danne-mark-i-prototype", {
    codexEntryId: "danne-mark-i-prototype",
    maxHp: 2,
    speed: 0,
    aggroRadius: 86,
    weakness: "review_folder",
    ai: "turret",
    scale: 0.03,
    body: { width: 20, height: 18, offsetX: -10, offsetY: -10 },
    loot: { documentPoints: 4 },
    behavior: "fixed prototype node firing slow ego bolts from the record queue",
    defeatMethod: "Use the Review Folder to route the issue to human review."
  }),
  "danne-colossus-final-form": config("danne-colossus-final-form", {
    codexEntryId: "danne-colossus-final-form",
    maxHp: 4,
    speed: 0,
    aggroRadius: 96,
    weakness: "red_pencil",
    ai: "turret",
    scale: 0.029,
    body: { width: 24, height: 22, offsetX: -12, offsetY: -12 },
    loot: { documentPoints: 8, processStamp: "sop", volumeFragment: "Black Vault Review Fragment" },
    behavior: "guards blast-door progression with boast-driven ego bolts",
    defeatMethod: "Use the Red Pencil to reject unsupported shortcut pressure."
  }),
  "danne-cloud-form": config("danne-cloud-form", {
    codexEntryId: "danne-cloud-form",
    maxHp: 3,
    speed: 22,
    aggroRadius: 78,
    weakness: "citation_stamp",
    ai: "patrol",
    scale: 0.03,
    body: { width: 22, height: 18, offsetX: -11, offsetY: -9 },
    loot: { documentPoints: 6 },
    behavior: "phase-shifts around the room and tries to blur the source trail",
    defeatMethod: "Use the Citation Stamp to anchor the provenance trail."
  }),
  "danne-executive-suit": config("danne-executive-suit", {
    codexEntryId: "danne-executive-suit",
    maxHp: 3,
    speed: 19,
    aggroRadius: 70,
    weakness: "review_folder",
    ai: "chase",
    scale: 0.03,
    body: { width: 18, height: 18, offsetX: -9, offsetY: -10 },
    loot: { documentPoints: 5 },
    behavior: "infiltrates hearings with shortcut memos and false certainty",
    defeatMethod: "Use the Review Folder to force a documented human decision."
  }),
  "danne-swarm": config("danne-swarm", {
    codexEntryId: "danne-swarm",
    maxHp: 2,
    speed: 27,
    aggroRadius: 62,
    weakness: "citation_stamp",
    ai: "patrol",
    scale: 0.03,
    body: { width: 18, height: 16, offsetX: -9, offsetY: -8 },
    loot: { documentPoints: 4 },
    behavior: "splits attention with small synchronized DANN-E units",
    defeatMethod: "Use the Citation Stamp to pin each source trail before the swarm spreads."
  }),
  "danne-defeated": config("danne-defeated", {
    codexEntryId: "danne-defeated",
    maxHp: 1,
    speed: 0,
    aggroRadius: 54,
    weakness: "red_pencil",
    ai: "turret",
    scale: 0.03,
    body: { width: 18, height: 16, offsetX: -9, offsetY: -8 },
    loot: { documentPoints: 2 },
    behavior: "plays dead as a false-surrender decoy near the final gate",
    defeatMethod: "Use the Red Pencil to mark the false ending as unsupported."
  }),
  "danne-ascendant": config("danne-ascendant", {
    codexEntryId: "danne-ascendant",
    maxHp: 5,
    speed: 21,
    aggroRadius: 92,
    weakness: "red_pencil",
    ai: "chase",
    scale: 0.03,
    body: { width: 24, height: 22, offsetX: -12, offsetY: -12 },
    loot: { documentPoints: 10, volumeFragment: "Ascendant Record Fragment" },
    behavior: "true-form pursuit with redaction-wing pressure and boast loops",
    defeatMethod: "Use the Red Pencil to keep every deletion visible before publication."
  })
} as const satisfies Record<DanneEnemyVariantId, DanneEnemyVariantConfig>;

export function danneEnemyVariant(id: DanneEnemyVariantId): DanneEnemyVariantConfig {
  return DANNE_ENEMY_VARIANTS[id];
}
