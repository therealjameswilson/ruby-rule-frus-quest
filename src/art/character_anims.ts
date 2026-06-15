import type Phaser from "phaser";
import { CHARACTERS, type CharacterKey } from "./characters";

// The native art-pack sheets are a 4x4 grid of 32x48 cells, but only the first
// three rows (idle 0-3, walk 4-11) hold complete character poses on every sheet.
// Row 3 (cells 12-15) is inconsistent: some sheets carry real action art there,
// but others (e.g. sprite_compiler) only have a few stray pixels along the top
// edge of the cell. Playing those cells rendered a detached horizontal sliver
// floating above the body — the stray fragments seen on the JR desk and rug in
// Office Hub. Action poses therefore reuse complete idle frames so every pose is
// guaranteed to be a full, correctly oriented sprite regardless of sheet.
export const FRAMES = {
  idle: { down: 0, up: 1, left: 2, right: 3 },
  walk: { down: [4, 5], up: [6, 7], left: [8, 9], right: [10, 11] },
  action: { interact: 0, reading: 0, approval: 1 }
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
