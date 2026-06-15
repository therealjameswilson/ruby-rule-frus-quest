import type Phaser from "phaser";
import { CHARACTERS, type CharacterKey } from "./characters";

// The native art-pack sheets are a 4x4 grid of 32x48 cells, but the source art
// is badly misassembled: in nearly every cell the body is split by a horizontal
// transparent band that leaves the legs/feet as a detached lower segment, and
// many cells (idle up/right, every walk cell) also carry stray pixel columns
// clinging to a cell edge. Drawn at the sprite origin (0.5, 0.9) the detached
// feet land on the shadow line and render as a free-floating black/orange
// fragment over the ground shadow — the artifact QA saw near the Junior Compiler
// in Office Hub.
//
// Only the idle-down cell (frame 0) is a single, edge-clean body on every sheet,
// and its one vertical gap is closed in the shipped PNGs. To guarantee every
// character is always a complete, fragment-free sprite regardless of facing, all
// directions and action poses resolve to frame 0. Characters convey motion via
// position/bob rather than per-frame poses, so this removes the defect at the
// source with no visible loss of animation.
export const FRAMES = {
  idle: { down: 0, up: 0, left: 0, right: 0 },
  walk: { down: [0], up: [0], left: [0], right: [0] },
  action: { interact: 0, reading: 0, approval: 0 }
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
