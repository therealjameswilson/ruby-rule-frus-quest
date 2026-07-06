import { gameState, setLatestMessage, setObjective } from "../game/state";
import type { DanneEnemy } from "../entities/DanneEnemy";

export interface RoomClearGate {
  roomId: string;
  requiredEnemyCount: number;
  defeatedEnemyCount: number;
  cleared: boolean;
  unlockedFlags: readonly string[];
}

export function roomClearFlag(roomId: string) {
  return `roomClear:${roomId}`;
}

export function isRoomCleared(roomId: string) {
  return Boolean(gameState.sceneProgress[roomClearFlag(roomId)]);
}

export function roomClearStatus(roomId: string, enemies: readonly DanneEnemy[], unlockedFlags: readonly string[] = []): RoomClearGate {
  const requiredEnemyCount = enemies.length;
  const defeatedEnemyCount = enemies.filter((enemy) => enemy.defeated).length;
  const cleared = requiredEnemyCount === 0 || defeatedEnemyCount >= requiredEnemyCount || isRoomCleared(roomId);
  return {
    roomId,
    requiredEnemyCount,
    defeatedEnemyCount,
    cleared,
    unlockedFlags
  };
}

export function applyRoomClearGate(roomId: string, enemies: readonly DanneEnemy[], unlockedFlags: readonly string[], message: string) {
  const status = roomClearStatus(roomId, enemies, unlockedFlags);
  if (!status.cleared || isRoomCleared(roomId)) return status;
  gameState.sceneProgress[roomClearFlag(roomId)] = 1;
  for (const flag of unlockedFlags) gameState.sceneProgress[flag] = 1;
  setObjective(message);
  setLatestMessage(message);
  return roomClearStatus(roomId, enemies, unlockedFlags);
}
