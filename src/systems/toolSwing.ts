import type { Player } from "../entities/Player";
import { gameState, hasProcessItem } from "../game/state";
import { isWeaponTool } from "./weaponState";

export function tryEquippedToolSwing(player: Pick<Player, "startAction" | "combatReadout">): { started: boolean; reason?: string } {
  const tool = gameState.equippedProcessItem;
  if (!isWeaponTool(tool) || !hasProcessItem(tool)) {
    return { started: false, reason: "EQUIP A STAMP, PENCIL OR FOLDER" };
  }
  if (player.combatReadout.state === "hurt") return { started: false };
  return { started: player.startAction(tool) };
}
