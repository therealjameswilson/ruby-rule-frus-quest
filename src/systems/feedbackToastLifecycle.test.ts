import type Phaser from "phaser";
import { describe, expect, it, vi } from "vitest";
import { FeedbackToast } from "./feedbackToast";

vi.mock("phaser", () => ({ default: {
  Display: { Color: { HexStringToColor: () => ({ color: 0 }) } },
  Scenes: { Events: { SHUTDOWN: "shutdown" } }
} }));
vi.mock("./verification", () => ({ CHOICE_PROMPT_OPEN_EVENT: "choice-open" }));

function node() {
  return {
    visible: false, width: 80, displayWidth: 82,
    setVisible(value: boolean) { this.visible = value; return this; },
    setOrigin() { return this; }, setStrokeStyle() { return this; },
    setDepth() { return this; }, setResolution() { return this; },
    setText() { return this; }, setSize() { return this; },
    setColor() { return this; }, setPosition() { return this; },
    setAlpha() { return this; }
  };
}

function fixture() {
  const scene = {
    add: { rectangle: node, text: node, container: node },
    events: { on: vi.fn(), once: vi.fn(), off: vi.fn() }
  } as unknown as Phaser.Scene;
  return new FeedbackToast(scene);
}

describe("interaction feedback lifecycle", () => {
  const anchor = { x: 128, y: 160 };

  it("dismisses a proximity hint when its action becomes reachable", () => {
    const toast = fixture();
    toast.showInteractionHint("STEP CLOSER", anchor);
    expect(toast.visible).toBe(true);
    toast.dismissInteractionHint();
    expect(toast.visible).toBe(false);
    toast.update(16, anchor);
    expect(toast.visible).toBe(false);
  });

  it("does not dismiss reward or review feedback in interaction range", () => {
    const toast = fixture();
    toast.showInteractionHint("NOTHING HERE", anchor);
    toast.show("ARCHIVE GUIDE OPEN", anchor, "info");
    toast.dismissInteractionHint();
    expect(toast.visible).toBe(true);
    toast.show("REVISE COVERAGE", anchor, "warn");
    toast.dismissInteractionHint();
    expect(toast.visible).toBe(true);
  });

  it("still expires a proximity hint when no action is reached", () => {
    const toast = fixture();
    toast.showInteractionHint("STEP CLOSER", anchor);
    toast.update(2000, anchor);
    expect(toast.visible).toBe(false);
  });
});
