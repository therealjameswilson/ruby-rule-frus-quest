import { AREA_REGISTRY, FRUS_ROOM_GRAPH, ITEM_REGISTRY } from "../game/constants";
import type { AreaId, Direction, ProcessItemId, ProcessStampId, RoomDefinition } from "../game/constants";

export interface DungeonState {
  areaId: AreaId;
  smallKeys: number;
  smallKeysRequired: number;
  bigKeyHeld: boolean;
  bossDefeated: boolean;
  mapRevealed: boolean;
}

export type DungeonStateRegistry = Record<AreaId, DungeonState>;

export const DUNGEON_BOSS_STAMP: Partial<Record<AreaId, ProcessStampId>> = {
  office_hub: "rule",
  archive_cavern: "archive",
  two_networks: "network",
  referral_vault: "referral",
  editors_labyrinth: "sop",
  silent_read_tower: "proof"
} as const;

const FINAL_GATE_BIG_KEY: Partial<Record<AreaId, ProcessItemId>> = {
  buckram_gate: "buckram_key"
} as const;

function requiredSmallKeysForArea(areaId: AreaId) {
  return FRUS_ROOM_GRAPH.filter((room) => room.area === areaId && room.lockedExits).reduce((total, room) => {
    const lockedDirections = Object.keys(room.lockedExits ?? {}) as Direction[];
    const smallKeyDoors = lockedDirections.filter((direction) => !isBossDoor(room, direction));
    return total + smallKeyDoors.length;
  }, 0);
}

export function bigKeyForArea(areaId: AreaId): ProcessItemId | null {
  const finalGateKey = FINAL_GATE_BIG_KEY[areaId];
  if (finalGateKey) return finalGateKey;
  const area = AREA_REGISTRY.find((candidate) => candidate.id === areaId);
  if (!area || area.rewardType !== "item") return null;
  return ITEM_REGISTRY.some((item) => item.id === area.rewardId)
    ? area.rewardId as ProcessItemId
    : null;
}

export function createInitialDungeonState(areaId: AreaId): DungeonState {
  return {
    areaId,
    smallKeys: 0,
    smallKeysRequired: requiredSmallKeysForArea(areaId),
    bigKeyHeld: false,
    bossDefeated: false,
    mapRevealed: false
  };
}

export function createInitialDungeonStates(): DungeonStateRegistry {
  return Object.fromEntries(
    AREA_REGISTRY.map((area) => [area.id, createInitialDungeonState(area.id)])
  ) as DungeonStateRegistry;
}

export function normalizeDungeonStates(states?: Partial<Record<AreaId, Partial<DungeonState>>>): DungeonStateRegistry {
  const initial = createInitialDungeonStates();
  for (const area of AREA_REGISTRY) {
    const saved = states?.[area.id];
    if (!saved) continue;
    initial[area.id] = {
      ...initial[area.id],
      ...saved,
      areaId: area.id,
      smallKeys: Math.max(0, Math.round(saved.smallKeys ?? initial[area.id].smallKeys)),
      smallKeysRequired: Math.max(0, Math.round(saved.smallKeysRequired ?? initial[area.id].smallKeysRequired)),
      bigKeyHeld: Boolean(saved.bigKeyHeld),
      bossDefeated: Boolean(saved.bossDefeated),
      mapRevealed: Boolean(saved.mapRevealed)
    };
  }
  return initial;
}

export function earnSmallKey(dungeon: DungeonState): DungeonState {
  return {
    ...dungeon,
    smallKeys: dungeon.smallKeys + 1,
    mapRevealed: true
  };
}

export function useSmallKey(dungeon: DungeonState): DungeonState {
  if (!canOpenLockedDoor(dungeon)) return dungeon;
  return {
    ...dungeon,
    smallKeys: dungeon.smallKeys - 1
  };
}

export function canOpenLockedDoor(dungeon: DungeonState): boolean {
  return dungeon.smallKeys > 0;
}

export function canOpenBossDoor(dungeon: DungeonState): boolean {
  return dungeon.bigKeyHeld;
}

export function dungeonComplete(dungeon: DungeonState): boolean {
  return dungeon.bossDefeated;
}

export function isBossDoor(room: RoomDefinition, direction: Direction) {
  const targetId = room.exits[direction];
  const target = targetId ? FRUS_ROOM_GRAPH.find((candidate) => candidate.id === targetId) : undefined;
  return room.roomType === "boss" || target?.roomType === "boss";
}

export function bossStampForArea(areaId: AreaId) {
  return DUNGEON_BOSS_STAMP[areaId] ?? null;
}
