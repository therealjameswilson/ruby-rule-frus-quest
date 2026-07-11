import { describe, expect, it } from "vitest";
import {
  decideInteractionFeedback,
  nearestInteractable,
  nearestInteractableHint,
  CRITICAL_INTERACTION_RADIUS_PAD,
  PROMPT_HINT_MARGIN
} from "./interaction";
import type { Interactable } from "../game/types";

function make(overrides: Partial<Interactable> = {}): Interactable {
  return {
    id: "desk",
    label: "Production Inbox",
    x: 60,
    y: 154,
    radius: 28,
    kind: "document",
    onInteract: () => {},
    ...overrides
  };
}

describe("decideInteractionFeedback", () => {
  it("acts when a target is inside the strict interact radius", () => {
    const target = make();
    const feedback = decideInteractionFeedback(target, target);
    expect(feedback.kind).toBe("act");
    if (feedback.kind === "act") expect(feedback.target).toBe(target);
  });

  it("nudges step-closer when only a hint target exists (in dense rooms)", () => {
    const hint = make();
    const feedback = decideInteractionFeedback(null, hint);
    expect(feedback.kind).toBe("step-closer");
    if (feedback.kind === "step-closer") expect(feedback.target).toBe(hint);
  });

  it("reports nothing when there is neither an actable nor a hint target", () => {
    expect(decideInteractionFeedback(null, null).kind).toBe("nothing");
  });
});

describe("step-closer is live-verifiable: a band exists where hint shows but cannot act", () => {
  it("finds a hint but no actable target just outside the strict radius", () => {
    const target = make({ x: 0, y: 0, radius: 20 });
    // Stand between the strict radius (20) and the hint radius (20 + margin).
    const player = { x: 0, y: 20 + PROMPT_HINT_MARGIN - 1 };
    const actable = nearestInteractable(player, [target]);
    const hint = nearestInteractableHint(player, [target]);
    expect(actable).toBeNull();
    expect(hint).toBe(target);
    expect(decideInteractionFeedback(actable, hint).kind).toBe("step-closer");
  });

  it("acts once the player crosses into the strict radius", () => {
    const target = make({ x: 0, y: 0, radius: 20 });
    const player = { x: 0, y: 18 };
    const actable = nearestInteractable(player, [target]);
    const hint = nearestInteractableHint(player, [target]);
    expect(actable).toBe(target);
    expect(decideInteractionFeedback(actable, hint).kind).toBe("act");
  });

  it("reports nothing once the player is beyond even the hint radius", () => {
    const target = make({ x: 0, y: 0, radius: 20 });
    const player = { x: 0, y: 20 + CRITICAL_INTERACTION_RADIUS_PAD + PROMPT_HINT_MARGIN + 5 };
    const actable = nearestInteractable(player, [target]);
    const hint = nearestInteractableHint(player, [target]);
    expect(actable).toBeNull();
    expect(hint).toBeNull();
    expect(decideInteractionFeedback(actable, hint).kind).toBe("nothing");
  });
});
