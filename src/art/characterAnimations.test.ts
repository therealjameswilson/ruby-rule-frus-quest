import type Phaser from "phaser";
import { describe, expect, it } from "vitest";
import { CHARACTERS } from "./characters";
import { registerCharacterAnims, walkingFrame, WALK_POSE_MS } from "./character_anims";

describe("character animation cadence", () => {
  it("uses a passing pose between steps without changing idle or action timing", () => {
    const animations = new Map<string, Phaser.Types.Animations.Animation>();
    const scene = {
      anims: {
        exists: (key: string) => animations.has(key),
        create: (animation: Phaser.Types.Animations.Animation) => {
          if (!animation.key) throw new Error("Character animations require a key");
          animations.set(animation.key, animation);
        },
        generateFrameNumbers: (key: string, { frames }: { frames: number[] }) => frames.map(frame => ({ key, frame }))
      }
    } as unknown as Phaser.Scene;
    registerCharacterAnims(scene);
    for (const key of Object.keys(CHARACTERS)) {
      for (const direction of ["up", "down", "left", "right"]) {
        expect(animations.get(`${key}-walk-${direction}`)).toMatchObject({ frameRate: 1000 / WALK_POSE_MS, repeat: -1 });
        expect(animations.get(`${key}-idle-${direction}`)).toMatchObject({ frameRate: 1, repeat: -1 });
      }
      for (const action of ["interact", "reading", "approval"]) {
        expect(animations.get(`${key}-${action}`)).toMatchObject({ frameRate: 6, repeat: 0 });
      }
    }
    const count = animations.size;
    registerCharacterAnims(scene);
    expect(animations.size).toBe(count);
  });
});

// Both feet return under the body before the opposite foot extends, including
// when crossing a cycle boundary. The same phase is retained across turns.
it("alternates grounded passing poses and footfalls in every direction", () => {
  for (const [direction, expected] of Object.entries({
    down: [0, 4, 0, 5, 0], up: [1, 6, 1, 7, 1],
    left: [2, 8, 2, 9, 2], right: [3, 10, 3, 11, 3]
  })) {
    expect(expected.map((_, i) => walkingFrame(direction as "down", i * WALK_POSE_MS))).toEqual(expected);
    expect(walkingFrame(direction as "down", WALK_POSE_MS - 0.01)).toBe(expected[0]);
  }
});
