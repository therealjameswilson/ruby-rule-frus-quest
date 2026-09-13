import { beforeEach, describe, expect, it, vi } from "vitest";
import { NaraStacksScene } from "./NaraStacksScene";
import type { Position } from "../game/types";

const polygon = vi.hoisted(() => ({ allowed: true }));
vi.mock("phaser", () => ({ default: {
  Scene: class {}, GameObjects: { Sprite: class {} },
  Geom: { Point: class {}, Polygon: class { static Contains() { return polygon.allowed; } } }
} }));

beforeEach(() => { polygon.allowed = true; });

describe("expansion-map walking footprint", () => {
  const makeScene = () => Object.assign(new NaraStacksScene(), {
    solids: [{ x: 178, y: 52, width: 10, height: 28 }, { x: 220, y: 52, width: 12, height: 28 }]
  }) as unknown as { isPlayerPositionWalkable(position: Position): boolean };

  it("accepts both clear doorway edges without restoring the old wider feet", () => {
    const scene = makeScene();
    for (const x of [194, 195, 204, 213, 214]) expect(scene.isPlayerPositionWalkable({ x, y: 74 })).toBe(true);
    for (const x of [193, 215]) expect(scene.isPlayerPositionWalkable({ x, y: 74 })).toBe(false);
  });

  it("preserves map polygon restrictions even where no solid overlaps", () => {
    polygon.allowed = false;
    expect(makeScene().isPlayerPositionWalkable({ x: 204, y: 74 })).toBe(false);
  });
});
