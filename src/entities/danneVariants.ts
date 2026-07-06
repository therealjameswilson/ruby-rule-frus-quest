import type { ProcessItemId, ProcessStampId } from "../game/constants";
import {
  DANNE_BOSS_SPRITE_ASSET,
  DANNE_RUNTIME_SPRITE_ASSETS,
  DANNE_VARIANT_ASSETS
} from "../game/danneAtlas";

export type DanneEnemyAiKind = "patrol" | "chase" | "turret";
export type DanneEnemyVariantId =
  | "redactor_drone"
  | "censorship_wraith"
  | "danne_mark_i"
  | "danne_executive"
  | "danne_swarm_unit"
  | "danne_colossus_node";

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

function runtimeTextureKey(entityId: string) {
  return DANNE_RUNTIME_SPRITE_ASSETS.find((asset) => asset.entityId === entityId)?.key ?? DANNE_BOSS_SPRITE_ASSET.key;
}

function variantTextureKey(variantId: string) {
  return DANNE_VARIANT_ASSETS.find((asset) => asset.variantId === variantId)?.key ?? DANNE_BOSS_SPRITE_ASSET.key;
}

export const DANNE_ENEMY_VARIANTS = {
  redactor_drone: {
    id: "redactor_drone",
    displayName: "Redactor Drone",
    textureKey: runtimeTextureKey("redactor-drone"),
    codexEntryId: "enemy-redactor-drone",
    maxHp: 2,
    speed: 23,
    aggroRadius: 58,
    weakness: "citation_stamp",
    ai: "patrol",
    scale: 0.18,
    body: { width: 18, height: 14, offsetX: -9, offsetY: -7 },
    loot: { documentPoints: 3 },
    behavior: "patrols shelves and drops automated black-bar pressure",
    defeatMethod: "Use the Citation Stamp after checking provenance."
  },
  censorship_wraith: {
    id: "censorship_wraith",
    displayName: "Censorship Wraith",
    textureKey: runtimeTextureKey("censorship-wraith"),
    codexEntryId: "enemy-censorship-wraith",
    maxHp: 3,
    speed: 17,
    aggroRadius: 64,
    weakness: "red_pencil",
    ai: "chase",
    scale: 0.15,
    body: { width: 18, height: 18, offsetX: -9, offsetY: -10 },
    loot: { documentPoints: 5 },
    behavior: "drifts toward the player and sweeps away unsupported text",
    defeatMethod: "Use the Red Pencil to mark unsupported material openly."
  },
  danne_mark_i: {
    id: "danne_mark_i",
    displayName: "DANN-E Mark I",
    textureKey: variantTextureKey("danne-mark-i-prototype"),
    codexEntryId: "danne-mark-i-prototype",
    maxHp: 2,
    speed: 0,
    aggroRadius: 86,
    weakness: "review_folder",
    ai: "turret",
    scale: 0.044,
    body: { width: 20, height: 18, offsetX: -10, offsetY: -10 },
    loot: { documentPoints: 4 },
    behavior: "fixed prototype node firing slow ego bolts from the record queue",
    defeatMethod: "Use the Review Folder to route the issue to human review."
  },
  danne_executive: {
    id: "danne_executive",
    displayName: "DANN-E Executive",
    textureKey: variantTextureKey("danne-executive-suit"),
    codexEntryId: "danne-executive-suit",
    maxHp: 3,
    speed: 19,
    aggroRadius: 70,
    weakness: "review_folder",
    ai: "chase",
    scale: 0.042,
    body: { width: 18, height: 18, offsetX: -9, offsetY: -10 },
    loot: { documentPoints: 5 },
    behavior: "infiltrates hearings with shortcut memos and false certainty",
    defeatMethod: "Use the Review Folder to force a documented human decision."
  },
  danne_swarm_unit: {
    id: "danne_swarm_unit",
    displayName: "Mini DANN-E",
    textureKey: DANNE_BOSS_SPRITE_ASSET.key,
    codexEntryId: "danne-swarm",
    maxHp: 1,
    speed: 28,
    aggroRadius: 56,
    weakness: "citation_stamp",
    ai: "patrol",
    scale: 0.045,
    body: { width: 16, height: 14, offsetX: -8, offsetY: -8 },
    loot: { documentPoints: 2 },
    behavior: "small automated record-pusher trying to split attention",
    defeatMethod: "Use the Citation Stamp to pin the source trail."
  },
  danne_colossus_node: {
    id: "danne_colossus_node",
    displayName: "DANN-E Gate Node",
    textureKey: DANNE_BOSS_SPRITE_ASSET.key,
    codexEntryId: "enemy-danne-boss",
    maxHp: 4,
    speed: 0,
    aggroRadius: 92,
    weakness: "red_pencil",
    ai: "turret",
    scale: 0.085,
    body: { width: 22, height: 20, offsetX: -11, offsetY: -11 },
    loot: { documentPoints: 8, processStamp: "sop", volumeFragment: "Black Vault Review Fragment" },
    behavior: "guards blast-door progression with boast-driven ego bolts",
    defeatMethod: "Use the Red Pencil to reject unsupported shortcut pressure."
  }
} as const satisfies Record<DanneEnemyVariantId, DanneEnemyVariantConfig>;

export function danneEnemyVariant(id: DanneEnemyVariantId): DanneEnemyVariantConfig {
  return DANNE_ENEMY_VARIANTS[id];
}
