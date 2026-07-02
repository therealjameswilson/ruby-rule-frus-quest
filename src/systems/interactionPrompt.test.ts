import { describe, expect, it } from "vitest";
import { computePromptPlacement, promptVerbForKind } from "./interactionPromptPlacement";
import type { Interactable } from "../game/types";

function make(overrides: Partial<Interactable> = {}): Interactable {
  return {
    id: "x",
    label: "Junior Compiler",
    x: 70,
    y: 122,
    radius: 30,
    kind: "npc",
    onInteract: () => {},
    ...overrides
  };
}

describe("promptVerbForKind", () => {
  it("maps each interactable kind to a readable verb", () => {
    expect(promptVerbForKind("npc")).toBe("TALK");
    expect(promptVerbForKind("door")).toBe("ENTER");
    expect(promptVerbForKind("terminal")).toBe("USE");
    expect(promptVerbForKind("document")).toBe("CHECK");
    expect(promptVerbForKind("manuscript")).toBe("READ");
  });
});

describe("computePromptPlacement", () => {
  it("hides when there is no nearest interactable", () => {
    const placement = computePromptPlacement(null);
    expect(placement.visible).toBe(false);
    expect(placement.label).toBe("");
  });

  it("shows an uppercased label with the kind verb above the target", () => {
    const placement = computePromptPlacement(make({ x: 70, y: 122, kind: "npc" }));
    expect(placement.visible).toBe(true);
    expect(placement.label).toBe("JUNIOR COMPILER");
    expect(placement.verb).toBe("TALK");
    // Floats above the target, not on top of it.
    expect(placement.y).toBeLessThan(122);
    expect(placement.ringX).toBe(70);
    expect(placement.ringY).toBe(122);
  });

  it("clamps the anchor X so the panel stays on-screen", () => {
    const left = computePromptPlacement(make({ x: 2, y: 100 }));
    expect(left.x).toBeGreaterThanOrEqual(36);
    const right = computePromptPlacement(make({ x: 254, y: 100 }));
    expect(right.x).toBeLessThanOrEqual(256 - 36);
  });

  it("never floats the prompt above the top HUD band", () => {
    const placement = computePromptPlacement(make({ x: 100, y: 44 }), { left: 36, right: 220, top: 50 });
    expect(placement.y).toBeGreaterThanOrEqual(50);
  });

  it("can reserve a bottom band for dense in-world UI", () => {
    const placement = computePromptPlacement(make({ x: 100, y: 190 }), { left: 36, right: 220, top: 50, bottom: 92 });
    expect(placement.y).toBe(92);
  });
});
