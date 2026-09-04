import { describe, expect, it, vi } from "vitest";
import type { Interactable } from "../game/types";
import { nearestInteractableHint, nearestWorkflowInteraction } from "../systems/interaction";
import { archiveSourceInteractionTargets } from "./archiveSourceInteraction";

const source: Interactable = {
  id: "source-note", label: "Source Note 47", kind: "document", x: 128, y: 164, onInteract: vi.fn()
};
const stairs: Interactable = {
  id: "nara-stacks-stairs", label: "NARA II Stacks", kind: "door", x: 128, y: 201, radius: 14, onInteract: vi.fn()
};

describe("Archive arrival interaction", () => {
  it("offers the source note, not the slightly closer optional stairs, on arrival", () => {
    const player = { x: 128, y: 184 };
    const targets = archiveSourceInteractionTargets(player, [stairs, source]);
    const action = nearestWorkflowInteraction(player, targets, ["citation_stamp"]);
    expect(action.interactable).toBe(source);
    expect(nearestInteractableHint(player, targets)).toBe(source);
  });

  it("preserves the stairs when deliberately approached", () => {
    const player = { x: 128, y: 201 };
    const targets = archiveSourceInteractionTargets(player, [stairs, source]);
    expect(nearestWorkflowInteraction(player, targets, []).interactable).toBe(stairs);
  });

  it("does not retain collected documents or alter interaction ranges", () => {
    expect(archiveSourceInteractionTargets({ x: 128, y: 184 }, [stairs])).toEqual([stairs]);
    const player = { x: 128, y: 50 };
    const targets = archiveSourceInteractionTargets(player, [source, stairs]);
    expect(nearestWorkflowInteraction(player, targets, []).interactable).toBeNull();
    expect(nearestInteractableHint(player, targets)).toBeNull();
  });
});
