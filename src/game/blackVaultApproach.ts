import type { Interactable, Position } from "./types";
import { nearestInteractable } from "../systems/interaction";

export function blackVaultReturnRoute(enteredFromProof: boolean, researchReviewMissing = false) {
  return enteredFromProof && !researchReviewMissing
    ? { sceneKey: "SilentReadScene", label: "Return to Proof" } as const
    : { sceneKey: "ArchiveScene", label: "Return to Archive" } as const;
}

export function blackVaultApproachTargets(position: Position, targets: Interactable[], cacheUsed: boolean) {
  const available = targets.filter((target) => !cacheUsed || target.id !== "vault-reliability-cache");
  const cache = available.find((target) => target.id === "vault-reliability-cache");
  // Arrival is between the cache and exit. Moving south deliberately restores
  // the exit; standing at the arrival point follows the displayed objective.
  if (cache && position.y <= 206 && nearestInteractable(position, [cache])) {
    return available.filter((target) => target.id !== "vault-return");
  }
  return available;
}
