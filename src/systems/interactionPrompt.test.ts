import { describe, expect, it } from "vitest";
import { computePromptPlacement, fitPromptText, promptVerbForKind } from "./interactionPromptPlacement";
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

  it.each([2, 70, 204, 254])("keeps a measured long panel fully visible at target x=%s", (x) => {
    const panelWidth = 158;
    const placement = computePromptPlacement(make({ x }), undefined, panelWidth);
    expect(placement.x - panelWidth / 2).toBeGreaterThanOrEqual(8);
    expect(placement.x + panelWidth / 2).toBeLessThanOrEqual(248);
    expect(placement.ringX).toBe(x);
  });

  it("fits a nearly full-width panel even when custom anchor bounds conflict", () => {
    const placement = computePromptPlacement(make({ x: 204 }), { left: 140, right: 220, top: 50 }, 238);
    expect(placement.x).toBe(128);
  });
});

describe("fitPromptText", () => {
  const measure = (text: string) => text.length * 6;
  it("preserves ordinary interaction names and verbs in full", () => {
    expect(fitPromptText("CHECK TREATY FRAGMENT I", measure)).toBe("CHECK TREATY FRAGMENT I");
  });
  it("shortens unusually long labels to a visible ellipsis without reducing font size", () => {
    const label = fitPromptText("CHECK THE COMPLETE DECLASSIFICATION REFERRAL AND CONCURRENCE REGISTER", measure);
    expect(label).toMatch(/^CHECK .+\.\.\.$/);
    expect(measure(label)).toBeLessThanOrEqual(220);
  });
});
