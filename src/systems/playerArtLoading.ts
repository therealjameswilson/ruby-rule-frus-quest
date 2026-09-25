import type Phaser from 'phaser';
import { ATTACK_POSE_SHEETS } from '../art/attackPoses';
import { getCharacterKeyForProcessRole, heroCharacterKey } from '../art/characters';
import { gameState } from '../game/state';

export function selectedAttackSheet() {
  const profile = gameState.playerProfile;
  return ATTACK_POSE_SHEETS[heroCharacterKey(getCharacterKeyForProcessRole(profile.roleId, gameState.ngPlusActive, profile.compilerAppearance))];
}

const menus = new Set(['TitleScene', 'WarningScene', 'TapToStartScene', 'CharacterCreateScene', 'DanneIntroScene']);
/** Gate gameplay on the chosen compiler only; leave menu previews immediately available. */
export function startWithPlayerArt(scene: Phaser.Scene, target: string, data?: object) {
  const sheet = selectedAttackSheet();
  if (menus.has(target) || !sheet || scene.textures.exists(sheet.key)) scene.scene.start(target, data);
  else scene.scene.start('PlayerArtLoadScene', {target, data});
}
