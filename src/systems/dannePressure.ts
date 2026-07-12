import { DANNE_LURKER_RELIABILITY_DAMAGE, type DanneLurkerHitKind } from "../game/danneLurkerBalance";
import { adjustReliability } from "./reliability";

export function applyDanneLurkerDamage(kind: DanneLurkerHitKind, context: string) {
  const damage = DANNE_LURKER_RELIABILITY_DAMAGE[kind];
  adjustReliability(-damage, context);
  return damage;
}
