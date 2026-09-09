import { describe, expect, it } from "vitest";
import type { Direction } from "../game/constants";
import {
  approach,
  frameDeltaSeconds,
  PLAYER_MOVEMENT_TUNING,
  resolveFacing,
  resolveMovementVector,
  snapRenderedPosition
} from "./smoothMovement";

describe("approach", () => {
  it("steps toward a higher target without overshooting", () => {
    expect(approach(0, 10, 3)).toBe(3);
    expect(approach(9, 10, 3)).toBe(10);
  });

  it("steps toward a lower target without overshooting", () => {
    expect(approach(10, 0, 4)).toBe(6);
    expect(approach(1, 0, 4)).toBe(0);
  });

  it("returns the target when already there", () => {
    expect(approach(5, 5, 3)).toBe(5);
  });
});

describe("frameDeltaSeconds", () => {
  it("converts milliseconds to seconds", () => {
    expect(frameDeltaSeconds(16)).toBeCloseTo(0.016, 5);
  });

  it("clamps runaway frame times to 50ms so a stall cannot teleport the player", () => {
    expect(frameDeltaSeconds(5000)).toBe(0.05);
  });

  it("never returns a negative delta", () => {
    expect(frameDeltaSeconds(-100)).toBe(0);
  });
});

describe("resolveMovementVector", () => {
  it("reports not moving when idle", () => {
    expect(resolveMovementVector({ x: 0, y: 0 })).toEqual({ x: 0, y: 0, moving: false });
  });

  it("passes cardinal input through at full magnitude", () => {
    expect(resolveMovementVector({ x: 1, y: 0 })).toEqual({ x: 1, y: 0, moving: true });
    expect(resolveMovementVector({ x: 0, y: -1 })).toEqual({ x: 0, y: -1, moving: true });
  });

  it("normalises diagonals so they are not faster than a cardinal move", () => {
    const diagonal = resolveMovementVector({ x: 1, y: 1 });
    expect(diagonal.moving).toBe(true);
    expect(Math.hypot(diagonal.x, diagonal.y)).toBeCloseTo(1, 6);
    expect(diagonal.x).toBeCloseTo(Math.SQRT1_2, 6);
    expect(diagonal.y).toBeCloseTo(Math.SQRT1_2, 6);
  });

  it("keeps the sign of each diagonal axis", () => {
    expect(resolveMovementVector({ x: -1, y: 1 })).toMatchObject({
      x: -Math.SQRT1_2,
      y: Math.SQRT1_2
    });
  });
});

describe("resolveFacing", () => {
  it("keeps the previous facing while idle", () => {
    const facings: Direction[] = ["north", "south", "east", "west"];
    for (const facing of facings) {
      expect(resolveFacing(facing, { x: 0, y: 0 })).toBe(facing);
    }
  });

  it("adopts the pressed cardinal direction", () => {
    expect(resolveFacing("south", { x: -1, y: 0 })).toBe("west");
    expect(resolveFacing("south", { x: 1, y: 0 })).toBe("east");
    expect(resolveFacing("east", { x: 0, y: -1 })).toBe("north");
    expect(resolveFacing("east", { x: 0, y: 1 })).toBe("south");
  });

  it("stays sticky: adding a second direction to form a diagonal does not flip facing", () => {
    // Walking north, then also press east -> keep facing north.
    expect(resolveFacing("north", { x: 1, y: -1 })).toBe("north");
    // Walking east, then also press south -> keep facing east.
    expect(resolveFacing("east", { x: 1, y: 1 })).toBe("east");
  });

  it("switches to the remaining direction once the held facing is released", () => {
    // Was facing east on a NE diagonal, release east -> now face north.
    expect(resolveFacing("east", { x: 0, y: -1 })).toBe("north");
  });

  it("defaults a fresh-from-rest diagonal to the horizontal component", () => {
    // Facing south (default) with no matching axis in a NE press -> horizontal wins.
    expect(resolveFacing("south", { x: 1, y: -1 })).toBe("east");
    expect(resolveFacing("north", { x: -1, y: 1 })).toBe("west");
  });
});

describe("snapRenderedPosition", () => {
  it("snaps fractional logical coordinates to whole pixels", () => {
    expect(snapRenderedPosition({ x: 10.4, y: 20.6 })).toEqual({ x: 10, y: 21 });
  });
});

// Numerically reproduces the velocity integration in Player.update. The
// shared tuning constants keep this test and the live controller from drifting
// apart as the movement feel is refined.
describe("overworld movement feel", () => {
  const SPEED = PLAYER_MOVEMENT_TUNING.speed;
  const ACCELERATION = PLAYER_MOVEMENT_TUNING.acceleration;
  const DECELERATION = PLAYER_MOVEMENT_TUNING.deceleration;
  const FRAME_MS = 1000 / 60;

  const step = (velocity: number, target: number, holding: boolean) => {
    const dt = frameDeltaSeconds(FRAME_MS);
    const rate = holding ? ACCELERATION : DECELERATION;
    return approach(velocity, target, rate * dt);
  };

  it("eases into full walking speed over three frames", () => {
    let velocity = 0;
    const firstFrame = step(velocity, SPEED, true);
    expect(firstFrame).toBeGreaterThan(0);
    expect(firstFrame).toBeLessThan(SPEED);
    velocity = step(firstFrame, SPEED, true);
    expect(velocity).toBeLessThan(SPEED);
    velocity = step(velocity, SPEED, true);
    expect(velocity).toBe(SPEED);
  });

  it("stops within two frames of release with less than one pixel of glide", () => {
    let velocity: number = SPEED;
    let glide = 0;
    let frames = 0;
    while (velocity > 0 && frames < 10) {
      velocity = step(velocity, 0, false);
      glide += velocity * frameDeltaSeconds(FRAME_MS);
      frames += 1;
    }
    expect(frames).toBeLessThanOrEqual(2);
    expect(glide).toBeLessThan(1);
  });

  it("blends through a reversal instead of snapping direction instantly", () => {
    let velocity: number = SPEED;
    const samples: number[] = [];
    while (velocity !== -SPEED && samples.length < 10) {
      velocity = step(velocity, -SPEED, true);
      samples.push(velocity);
    }
    expect(samples[0]).toBeGreaterThan(0);
    expect(samples.some((sample) => sample <= 0)).toBe(true);
    expect(samples.at(-1)).toBe(-SPEED);
    expect(samples.length).toBeLessThanOrEqual(6);
  });
});
