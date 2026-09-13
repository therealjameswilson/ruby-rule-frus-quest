import type Phaser from "phaser";
import { describe, expect, it, vi } from "vitest";
import { InteractionPrompt } from "./interactionPrompt";
import type { Interactable } from "../game/types";

vi.mock("phaser", () => ({ default: { Display: { Color: { HexStringToColor: () => ({ color: 0 }) } } } }));
vi.mock("../input/InputState", () => ({ getPrimaryActionBadge: () => "Z" }));

class Visual {
  x = 0; y = 0; width = 0; visible = false; name = "";
  rects: number[][] = [];
  destroy = vi.fn();
  setName(name: string) { this.name = name; return this; }
  setDepth() { return this; }
  setVisible(value: boolean) { this.visible = value; return this; }
  setOrigin() { return this; }
  setStrokeStyle() { return this; }
  setSize(width: number) { this.width = width; return this; }
  setPosition(x: number, y: number) { this.x = x; this.y = y; return this; }
  setText(text: string) { this.width = text.length * 6; return this; }
  fillStyle() { return this; }
  fillRect(x: number, y: number, w: number, h: number) { this.rects.push([x, y, w, h]); return this; }
}

function fixture() {
  const visuals: Visual[] = [];
  const add = () => { const visual = new Visual(); visuals.push(visual); return visual; };
  const scene = { add: { graphics: add, rectangle: add, triangle: add, text: add, container: add } };
  const prompt = new InteractionPrompt(scene as unknown as Phaser.Scene);
  const target: Interactable = { id: "document", label: "Source Note", kind: "document", x: 100.4, y: 160.6, radius: 30, onInteract: () => {} };
  return { prompt, target, visuals, brackets: visuals[0] };
}

describe("unobscured interaction target", () => {
  it("draws only eight one-pixel corner arms, with no solid center", () => {
    const { brackets } = fixture();
    expect(brackets.rects).toHaveLength(8);
    for (const [x, y, w, h] of brackets.rects) {
      expect([x, y, w, h].every(Number.isInteger)).toBe(true);
      expect(w === 1 || h === 1).toBe(true);
      expect(x + w <= -6 || x >= 6 || y + h <= -6 || y >= 6).toBe(true);
    }
  });

  it("keeps label and brackets stationary across time and hides them when out of range", () => {
    const { prompt, target, visuals, brackets } = fixture();
    prompt.update(16, target);
    const panel = visuals.find(v => v.name === "interaction-prompt")!;
    const before = { x: panel.x, y: panel.y };
    for (const elapsed of [90, 180, 220, 1000]) {
      prompt.update(elapsed, target);
      expect({ x: panel.x, y: panel.y }).toEqual(before);
      expect(brackets).toMatchObject({ x: 100, y: 161, visible: true });
    }
    prompt.update(16, null);
    expect(prompt.visible).toBe(false);
    expect(brackets.visible).toBe(false);
    prompt.destroy();
    expect(brackets.destroy).toHaveBeenCalledOnce();
  });
});
