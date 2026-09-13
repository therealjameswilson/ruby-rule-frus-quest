import type Phaser from "phaser";
import { describe, expect, it } from "vitest";
import { CHARACTERS } from "./characters";
import { registerCharacterAnims } from "./character_anims";

describe("character animation cadence", () => {
  it("uses eight walking frames per second without changing idle or action timing", () => {
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
        expect(animations.get(`${key}-walk-${direction}`)).toMatchObject({ frameRate: 8, repeat: -1 });
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
