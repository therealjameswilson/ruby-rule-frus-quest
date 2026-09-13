import type { Interactable, Position } from "./types";
import { nearestInteractable } from "../systems/interaction";

export function reviewCacheRefill(reliability: number) {
  return Math.max(0, Math.min(20, 100 - reliability));
}

export function blackVaultObjective(cacheUsed: boolean, reliability: number) {
  return !cacheUsed && reviewCacheRefill(reliability) > 0 ? "USE REVIEW CACHE" : "NORTH TO DANN-E";
}

export function blackVaultActionLine(target: string | null, bossCleared: boolean) {
  if (target === "Review Cache") return "CHECK REVIEW CACHE";
  if (target === "DANN-E Core") return bossCleared ? "TO THE BINDERY" : "BEGIN FINAL REVIEW";
  if (target === "Treaty Fragment III") return "TAKE FRAGMENT III";
  if (target === "Return to Proof" || target === "Return to Archive") return target.toUpperCase();
  return null;
}

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
