import type { Interactable, Position } from "../game/types";
import type { WorkflowTool } from "../game/types";
import { selectWorkflowToolForInteractable } from "../game/workflowTools";

export const ACTION_BUFFER_MS = 120;
export const INTERACTION_COYOTE_MS = 80;
export const CRITICAL_INTERACTION_RADIUS_PAD = 10;
export const UTILITY_INTERACTION_RADIUS_PAD = 6;

export function effectiveInteractRadius(interactable: Interactable, fallbackRadius: number) {
  const radius = interactable.radius ?? fallbackRadius;
  if (interactable.kind === "document" || interactable.kind === "manuscript") {
    return radius + CRITICAL_INTERACTION_RADIUS_PAD;
  }
  if (interactable.kind === "door" || interactable.kind === "terminal") {
    return radius + UTILITY_INTERACTION_RADIUS_PAD;
  }
  return radius;
}

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
    const radius = effectiveInteractRadius(interactable, maxDistance);
    if (distance <= radius && distance < nearestDistance) {
      nearest = interactable;
      nearestDistance = distance;
    }
  }
  return nearest;
}

// Extra reach (px) added to each interactable's interact radius when deciding
// whether to *show* its proximity prompt. The live audit (2026-06-15) could not
// see any prompt because nothing was inside the strict interact radius; showing
// the cue from a little further out makes the ring/plaque impossible to miss as
// the player approaches, while interaction itself still uses the strict radius.
export const PROMPT_HINT_MARGIN = 14;

// The nearest interactable whose prompt should be shown: the closest target
// within (radius + margin). Lets the floating "A VERB" plaque + ring appear as
// the player nears a target, even just before they are close enough to act.
export function nearestInteractableHint(
  player: Position,
  interactables: Interactable[],
  maxDistance = 24,
  margin = PROMPT_HINT_MARGIN
) {
  let nearest: Interactable | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;
  for (const interactable of interactables) {
    const dx = interactable.x - player.x;
    const dy = interactable.y - player.y;
    const distance = Math.hypot(dx, dy);
    const radius = effectiveInteractRadius(interactable, maxDistance) + margin;
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

// The outcome of pressing interact, decided purely from proximity so it can be
// unit-tested without Phaser. `act` => something is in strict range and should
// fire; `step-closer` => a hint target is nearby but just outside the strict
// radius, so nudge the player in; `nothing` => no usable target or hint at all.
export type InteractionFeedback =
  | { kind: "act"; target: Interactable }
  | { kind: "step-closer"; target: Interactable }
  | { kind: "nothing" };

// Decide what feedback an interact press should produce. `actable` is the target
// inside the strict interact radius (may be null); `hint` is the closest target
// inside the wider prompt radius (may be null). The live audit (2026-06-15) found
// dense rooms always have a hint nearby, so `step-closer` is the common case the
// player can verify by standing near — but not on — a target.
export function decideInteractionFeedback(
  actable: Interactable | null,
  hint: Interactable | null
): InteractionFeedback {
  if (actable) return { kind: "act", target: actable };
  if (hint) return { kind: "step-closer", target: hint };
  return { kind: "nothing" };
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
