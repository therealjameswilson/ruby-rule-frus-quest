import { DANNE_LURKER_RELIABILITY_DAMAGE, type DanneLurkerHitKind } from "../game/danneLurkerBalance";
import { adjustReliability } from "./reliability";
import type { Player } from "../entities/Player";
import type { Position } from "../game/types";
import { DANNE_BOSS_DAMAGE, DANNE_BOSS_RECOVERY_MS, type DanneBossHitKind } from "../game/danneBossCombat";
import { gameState } from "../game/state";

export function applyDanneLurkerDamage(kind: DanneLurkerHitKind, context: string) {
  const damage = DANNE_LURKER_RELIABILITY_DAMAGE[kind];
  adjustReliability(-damage, context);
  return damage;
}

export function takeDanneLurkerHit(player: Pick<Player, "takeHit">, source: Position, kind: DanneLurkerHitKind, context: string) {
  if (!player.takeHit(source, kind === "contact" ? 11 : 9, 700)) return false;
  applyDanneLurkerDamage(kind, context);
  return true;
}

export function takeDanneBossHit(player: Pick<Player, "takeHit">, source: Position, kind: DanneBossHitKind) {
  if (!player.takeHit(source, kind === "ego_bolt" ? 12 : 9, DANNE_BOSS_RECOVERY_MS)) return false;
  const before = gameState.reliability;
  adjustReliability(-DANNE_BOSS_DAMAGE[kind], kind === "ego_bolt" ? "DANN-E Ego bolt" : "DANN-E swarm pressure");
  gameState.sceneProgress.blackVaultCombatDamage = (gameState.sceneProgress.blackVaultCombatDamage ?? 0)
    + Math.max(0, before - gameState.reliability);
  return true;
}

export function recoverDanneBossPressure() {
  const lost = Math.max(0, gameState.sceneProgress.blackVaultCombatDamage ?? 0);
  gameState.sceneProgress.blackVaultCombatDamage = 0;
  if (lost > 0) adjustReliability(lost, "Review recovered after DANN-E pressure; documents preserved");
  return lost;
}
