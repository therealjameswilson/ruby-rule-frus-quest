import { describe, expect, it } from "vitest";
import type { Direction } from "../game/constants";
import {
  approach,
  frameDeltaSeconds,
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

// Numerically reproduces the velocity integration in Player.update using the
// same helpers and the tuned constants, so the ALTTP-crispness targets (a near
// instant ramp and no post-release glide) are guarded against silent drift if
// the acceleration/deceleration are ever retuned.
describe("overworld movement feel", () => {
  const SPEED = 58;
  const ACCELERATION = 2300;
  const DECELERATION = 4000;
  const FRAME_MS = 1000 / 60;

  const step = (velocity: number, target: number, holding: boolean) => {
    const dt = frameDeltaSeconds(FRAME_MS);
    const rate = holding ? ACCELERATION : DECELERATION;
    return approach(velocity, target, rate * dt);
  };

  it("reaches full walking speed within two frames of holding a direction", () => {
    let velocity = 0;
    velocity = step(velocity, SPEED, true);
    velocity = step(velocity, SPEED, true);
    expect(velocity).toBe(SPEED);
  });

  it("stops within a single frame of release with negligible glide", () => {
    let velocity = SPEED;
    let glide = 0;
    let frames = 0;
    while (velocity > 0 && frames < 10) {
      velocity = step(velocity, 0, false);
      glide += velocity * frameDeltaSeconds(FRAME_MS);
      frames += 1;
    }
    expect(frames).toBeLessThanOrEqual(1);
    expect(glide).toBeLessThan(0.5);
  });
});
