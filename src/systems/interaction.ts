import type { Interactable, Position } from "../game/types";
import type { WorkflowTool } from "../game/types";
import { selectWorkflowToolForInteractable } from "../game/workflowTools";

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

export function nearestWorkflowInteraction(
  player: Position,
  interactables: Interactable[],
  availableTools: readonly WorkflowTool[],
  maxDistance = 24
) {
  const interactable = nearestInteractable(player, interactables, maxDistance);
  return {
    interactable,
    tool: selectWorkflowToolForInteractable(availableTools, interactable)
  };
}
