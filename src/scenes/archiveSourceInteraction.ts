import type { Interactable, Position } from "../game/types";
import { nearestInteractable } from "../systems/interaction";

export function archiveSourceInteractionTargets(player: Position, interactables: Interactable[]) {
  const source = interactables.find((target) => target.id === "source-note");
  // The arrival tile overlaps the optional stairs' reach. Pick up the visible
  // source note first, but leave the stairs usable when approached directly.
  if (source && nearestInteractable(player, [source])) return [source];
  return interactables;
}
