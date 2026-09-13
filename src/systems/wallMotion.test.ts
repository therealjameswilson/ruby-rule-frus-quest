import { describe, expect, it } from "vitest";
import { wallFollowFactor } from "./wallMotion";

describe("bureaucratic wall follow timing", () => {
  it.each([7, 10, 16, 18, 20, 32])("preserves the 60Hz response at speed %s", speed => {
    expect(wallFollowFactor(speed, 1000 / 60)).toBeCloseTo(Math.min(0.22, speed / 60));
  });

  it.each([7, 10, 16, 18, 20, 32])("follows a fixed target equally across refresh rates at speed %s", speed => {
    const positions = [30, 60, 120, 144, 240].map(fps => {
      let x = 0;
      for (let i = 0; i < fps / 6; i++) {
        x += (100 - x) * wallFollowFactor(speed, 1000 / fps);
      }
      return x;
    });
    for (const x of positions) expect(x).toBeCloseTo(positions[0], 8);
  });

  it("does not drift with no elapsed time, or race ahead after a stall", () => {
    expect(wallFollowFactor(10, 0)).toBe(0);
    expect(wallFollowFactor(10, -5)).toBe(0);
    expect(wallFollowFactor(10, 2000)).toBe(wallFollowFactor(10, 50));
  });
});
