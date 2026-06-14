import type { Interactable, Position } from "../game/types";
import type { WorkflowTool } from "../game/types";
import { selectWorkflowToolForInteractable } from "../game/workflowTools";

export const ACTION_BUFFER_MS = 120;
export const INTERACTION_COYOTE_MS = 80;

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

export class InteractionAssist {
  private bufferedUntil = 0;
  private graceUntil = 0;
  private graceInteractable: Interactable | null = null;

  update(timeMs: number, actionJustPressed: boolean, nearest: Interactable | null) {
    if (nearest) {
      this.graceInteractable = nearest;
      this.graceUntil = timeMs + INTERACTION_COYOTE_MS;
    }
    if (actionJustPressed) this.bufferedUntil = timeMs + ACTION_BUFFER_MS;
    if (timeMs > this.bufferedUntil) return null;
    const target = nearest ?? (timeMs <= this.graceUntil ? this.graceInteractable : null);
    if (!target) return null;
    this.bufferedUntil = 0;
    return target;
  }

  clear() {
    this.bufferedUntil = 0;
    this.graceUntil = 0;
    this.graceInteractable = null;
  }
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
