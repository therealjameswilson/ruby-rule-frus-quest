import type Phaser from "phaser";
import {
  DANNE_BOSS_SPRITE_ASSET,
  DANNE_RUNTIME_SPRITE_ASSETS,
  DANNE_SPRITE_ASSETS,
  DANNE_VFX_ASSETS,
  type DanneBossSpriteAsset,
  type DanneRuntimeSpriteAsset,
  type DanneSpriteAsset
} from "../game/danneAtlas";

export const DANNE_SPRITE_FRAMES = {
  walk: {
    down: [0, 1, 2, 3],
    up: [4, 5, 6, 7],
    left: [8, 9, 10, 11],
    right: [8, 9, 10, 11]
  },
  attack: [12, 13, 14, 15]
} as const;

type DanneDirection = keyof typeof DANNE_SPRITE_FRAMES.walk;

export function danneAnimKey(textureKey: string, suffix: string) {
  return `${textureKey}-${suffix}`;
}

function createAnim(
  scene: Phaser.Scene,
  textureKey: string,
  suffix: string,
  frames: readonly number[],
  frameRate: number,
  repeat: number
) {
  const key = danneAnimKey(textureKey, suffix);
  if (scene.anims.exists(key) || !scene.textures.exists(textureKey)) return;
  scene.anims.create({
    key,
    frames: scene.anims.generateFrameNumbers(textureKey, { frames: [...frames] }),
    frameRate,
    repeat
  });
}

function registerSpriteSheetAnims(scene: Phaser.Scene, asset: DanneSpriteAsset | DanneRuntimeSpriteAsset | DanneBossSpriteAsset) {
  for (const direction of Object.keys(DANNE_SPRITE_FRAMES.walk) as DanneDirection[]) {
    createAnim(scene, asset.key, `walk-${direction}`, DANNE_SPRITE_FRAMES.walk[direction], 6, -1);
  }
  createAnim(scene, asset.key, "attack", DANNE_SPRITE_FRAMES.attack, 8, 0);
}

export function registerDanneAnims(scene: Phaser.Scene) {
  for (const asset of DANNE_SPRITE_ASSETS) {
    registerSpriteSheetAnims(scene, asset);
  }
  for (const asset of DANNE_RUNTIME_SPRITE_ASSETS) {
    registerSpriteSheetAnims(scene, asset);
  }
  registerSpriteSheetAnims(scene, DANNE_BOSS_SPRITE_ASSET);
  for (const asset of DANNE_VFX_ASSETS) {
    const frames = Array.from({ length: asset.cols * asset.rows }, (_value, index) => index);
    createAnim(scene, asset.key, "fly", frames, 10, -1);
  }
}
