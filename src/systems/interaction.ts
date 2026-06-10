import type { Interactable, Position } from "../game/types";

export function nearestInteractable(
  player: Position,
  interactables: Interactable[],
  maxDistance = 24
) {
  let nearest: Interactable | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;
  for (const interactable of interactables) {
    const dx = interactable.x - player.x;
    const dy = interactable.y - player.y;
    const distance = Math.hypot(dx, dy);
    const radius = interactable.radius ?? maxDistance;
    if (distance <= radius && distance < nearestDistance) {
      nearest = interactable;
      nearestDistance = distance;
    }
  }
  return nearest;
}
