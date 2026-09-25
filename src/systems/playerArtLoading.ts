import { DANNE_VFX_ASSETS } from '../game/danneAtlas';
import { WEAPON_VFX_ASSET } from './weaponState';
import type Phaser from 'phaser';
import { ATTACK_POSE_SHEETS } from '../art/attackPoses';
import { getCharacterKeyForProcessRole, heroCharacterKey } from '../art/characters';
import { gameState } from '../game/state';

export function selectedAttackSheet() {
  const profile = gameState.playerProfile;
  return ATTACK_POSE_SHEETS[heroCharacterKey(getCharacterKeyForProcessRole(profile.roleId, gameState.ngPlusActive, profile.compilerAppearance))];
}

export function preloadCombatEffects(scene: Phaser.Scene) {
  for (const asset of DANNE_VFX_ASSETS) {
    if (!scene.textures.exists(asset.key)) scene.load.spritesheet(asset.key, asset.path, {frameWidth: asset.frameW, frameHeight: asset.frameH});
  }
  if (!scene.textures.exists(WEAPON_VFX_ASSET.key)) scene.load.spritesheet(WEAPON_VFX_ASSET.key, WEAPON_VFX_ASSET.path, {
    frameWidth: WEAPON_VFX_ASSET.frameWidth, frameHeight: WEAPON_VFX_ASSET.frameHeight
  });
}

export function gameplayArtReady(scene: Phaser.Scene) {
  const sheet = selectedAttackSheet();
  return (!sheet || scene.textures.exists(sheet.key)) && scene.textures.exists(WEAPON_VFX_ASSET.key)
    && DANNE_VFX_ASSETS.every(asset => scene.textures.exists(asset.key));
}

const menus = new Set(['TitleScene', 'WarningScene', 'TapToStartScene', 'CharacterCreateScene', 'DanneIntroScene']);
/** Prepare the chosen compiler and shared combat effects; menu previews stay immediately available. */
export function startWithPlayerArt(scene: Phaser.Scene, target: string, data?: object) {
  if (menus.has(target) || gameplayArtReady(scene)) scene.scene.start(target, data);
  else scene.scene.start('PlayerArtLoadScene', {target, data});
}
