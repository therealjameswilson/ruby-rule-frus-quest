import type Phaser from "phaser";
import { CHARACTERS, type CharacterKey } from "./characters";

export const FRAMES = {
  idle: { down: 0, up: 1, left: 2, right: 3 },
  walk: { down: [4, 5], up: [6, 7], left: [8, 9], right: [10, 11] },
  action: { interact: 12, reading: 13, approval: 14 }
} as const;

type DirectionName = keyof typeof FRAMES.idle;

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
      mk(`walk-${direction}`, [...FRAMES.walk[direction]], 6, -1);
    }
    mk("interact", [FRAMES.action.interact], 6, 0);
    mk("reading", [FRAMES.action.reading], 6, 0);
    mk("approval", [FRAMES.action.approval], 6, 0);
  }
}
