import type { Interactable, Position } from "../game/types";
import type { WorkflowTool } from "../game/types";
import type { Direction } from "../game/constants";
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

export function facingInteractable(
  player: Position,
  facing: Direction,
  interactables: Interactable[],
  maxReach = 20,
  laneHalfWidth = 15
) {
  let target: Interactable | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const interactable of interactables) {
    const dx = interactable.x - player.x;
    const dy = interactable.y - player.y;
    let forward = 0;
    let lateral = 0;

    if (facing === "north") {
      forward = -dy;
      lateral = Math.abs(dx);
    } else if (facing === "south") {
      forward = dy;
      lateral = Math.abs(dx);
    } else if (facing === "west") {
      forward = -dx;
      lateral = Math.abs(dy);
    } else {
      forward = dx;
      lateral = Math.abs(dy);
    }

    const radius = interactable.radius ?? maxReach;
    if (forward < 0 || forward > Math.max(maxReach, radius)) continue;
    if (lateral > laneHalfWidth) continue;

    const score = forward + lateral * 0.5;
    if (score < bestScore) {
      target = interactable;
      bestScore = score;
    }
  }

  return target;
}
