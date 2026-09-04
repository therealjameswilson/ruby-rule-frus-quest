import { DANNE_LURKER_RELIABILITY_DAMAGE, type DanneLurkerHitKind } from "../game/danneLurkerBalance";
import { adjustReliability } from "./reliability";
import type { Player } from "../entities/Player";
import type { Position } from "../game/types";

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
