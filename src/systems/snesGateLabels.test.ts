import type Phaser from "phaser";
import { describe, expect, it, vi } from "vitest";
import { addSnesGate } from "./snesPixelArt";

vi.mock("phaser", () => ({ default: {
  Display: { Color: { HexStringToColor: () => ({ color: 0 }) } }
} }));

function fixture() {
  const nodes: { x: number; y: number; width: number; height: number; name: string }[] = [];
  function node(x: number, y: number, width: number, height: number) {
    const result = {
      x, y, width, height, name: "", originX: 0.5, originY: 0.5,
      setName(name: string) { this.name = name; return this; },
      setOrigin(x: number, y: number) { this.originX = x; this.originY = y; return this; },
      setPosition(x: number, y: number) { this.x = x; this.y = y; return this; },
      setStrokeStyle() { return this; }, setDepth() { return this; }
    };
    nodes.push(result);
    return result;
  }
  return {
    nodes,
    scene: {
      textures: { exists: () => false },
      add: { rectangle: node, text: (x: number, y: number, label: string) => node(x, y, label.length * 4, 6) }
    } as unknown as Phaser.Scene
  };
}

describe("gate captions", () => {
  for (const direction of ["north", "south", "east", "west"] as const) {
    for (const unlocked of [true, false]) {
      it(`${direction} ${unlocked ? "route" : "lock"} fits text without covering the gate glyph`, () => {
        const { scene, nodes } = fixture();
        addSnesGate(scene, { direction, hasExit: true, unlocked, exitLabel: "NETWORK", lockLabel: "CLEARANCE" });
        const frame = nodes.find(n => n.name === (unlocked ? "snes-gate-route-plaque" : "snes-gate-lock-seal"))!;
        const text = nodes.find(n => n.name === (unlocked ? "snes-gate-route-label" : "snes-gate-lock-label"))!;
        expect(text.x).toBeGreaterThanOrEqual(frame.x - frame.width / 2 + 3);
        expect(text.x + text.width).toBeLessThanOrEqual(frame.x + frame.width / 2 - 3);
        expect(Number.isInteger(text.x) && Number.isInteger(text.y)).toBe(true);
        expect(Number.isInteger(frame.y - frame.height / 2)).toBe(true);
        expect(frame.x - frame.width / 2).toBeGreaterThanOrEqual(18);
        expect(frame.x + frame.width / 2).toBeLessThanOrEqual(238);
        const glyph = nodes.find(n => n.name.startsWith("snes-gate-glyph-fallback"))!;
        expect(glyph.x).toBe(direction === "west" ? 8 : direction === "east" ? 248 : 128);
      });
    }
  }

  it("does not label a solid wall", () => {
    const { scene, nodes } = fixture();
    addSnesGate(scene, { direction: "east", hasExit: false, unlocked: false });
    expect(nodes.some(n => n.name.endsWith("label"))).toBe(false);
  });
});
