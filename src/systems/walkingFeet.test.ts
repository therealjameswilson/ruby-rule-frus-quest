import { describe, expect, it } from "vitest";
import { walkingFeetOverlap } from "./smoothMovement";

describe("walking feet clearance", () => {
  const wall = { x: 100, y: 100, width: 16, height: 16 };

  it("allows contact on all four edges without entering a wall", () => {
    for (const [x, y] of [[94, 104], [122, 104], [108, 95], [108, 119]]) {
      expect(walkingFeetOverlap(x, y, wall)).toBe(false);
    }
    for (const [x, y] of [[94.01, 104], [121.99, 104], [108, 95.01], [108, 118.99]]) {
      expect(walkingFeetOverlap(x, y, wall)).toBe(true);
    }
  });

  it("leaves two pixels of steering room on either side of a tile-wide passage", () => {
    const walls = [
      { x: 0, y: 0, width: 120, height: 240 },
      { x: 136, y: 0, width: 120, height: 240 }
    ];
    for (const x of [126, 127, 128, 129, 130]) {
      expect(walls.some(wall => walkingFeetOverlap(x, 100, wall))).toBe(false);
    }
    expect(walls.some(wall => walkingFeetOverlap(125.9, 100, wall))).toBe(true);
    expect(walls.some(wall => walkingFeetOverlap(130.1, 100, wall))).toBe(true);
  });
});
