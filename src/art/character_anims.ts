import type Phaser from "phaser";
import { CHARACTERS, type CharacterKey } from "./characters";

// Native sheets are 4 columns by 4 rows of 32x48 cells. The final cell is
// intentionally unused; keeping it untouched preserves the art-pack layout.
export const FRAMES = {
  idle: { down: 0, up: 1, left: 2, right: 3 },
  walk: { down: [4, 5], up: [6, 7], left: [8, 9], right: [10, 11] },
  action: { interact: 12, reading: 13, approval: 14 }
} as const;

type DirectionName = keyof typeof FRAMES.idle;

// A passing pose between opposite footfalls prevents the legs from snapping
// straight from one extended stride to the other. One cycle covers 32.4 ground
// pixels at normal walking speed; the Player advances this by distance traveled.
export const WALK_POSE_MS = 90;
export function walkingFrames(direction: DirectionName) {
  return [FRAMES.idle[direction], FRAMES.walk[direction][0],
    FRAMES.idle[direction], FRAMES.walk[direction][1]];
}

export function walkingFrame(direction: DirectionName, distanceClock: number) {
  const frames = walkingFrames(direction);
  return frames[Math.floor(Math.max(0, distanceClock) / WALK_POSE_MS) % frames.length];
}

export function characterAnimKey(key: CharacterKey, suffix: string) {
  return `${key}-${suffix}`;
}

export function registerCharacterAnims(scene: Phaser.Scene) {
  for (const key of Object.keys(CHARACTERS) as CharacterKey[]) {
    const mk = (suffix: string, frames: number[], rate = 6, repeat = -1) => {
      const animKey = characterAnimKey(key, suffix);
      if (scene.anims.exists(animKey)) return;
      scene.anims.create({
        key: animKey,
        frames: scene.anims.generateFrameNumbers(key, { frames }),
        frameRate: rate,
        repeat
      });
    };
    for (const direction of Object.keys(FRAMES.idle) as DirectionName[]) {
      mk(`idle-${direction}`, [FRAMES.idle[direction]], 1, -1);
      mk(`walk-${direction}`, walkingFrames(direction), 1000 / WALK_POSE_MS, -1);
    }
    mk("interact", [FRAMES.action.interact], 6, 0);
    mk("reading", [FRAMES.action.reading], 6, 0);
    mk("approval", [FRAMES.action.approval], 6, 0);
  }
}
