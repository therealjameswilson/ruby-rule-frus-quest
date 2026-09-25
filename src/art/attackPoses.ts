import type Phaser from 'phaser';
import type { Direction } from '../game/constants';
import type { WeaponReadout, WeaponTiming } from '../systems/weaponState';

export const ATTACK_POSE_KEY = 'compiler-attack-v1';
export const ATTACK_POSE_PATH = 'assets/characters/compilers/combat/compiler-attack-v1.png';
// Measured from alpha >=128; the bottom 45 source pixels locate the planted feet.
export const ATTACK_POSES = [
  {top:84,bottom:495,center:133.5}, {top:85,bottom:486,center:135.5},
  {top:92,bottom:493,center:131.5}, {top:89,bottom:494,center:125},
  {top:82,bottom:484,center:134}, {top:81,bottom:478,center:129},
  {top:86,bottom:479,center:139}, {top:83,bottom:481,center:124.5},
  {top:45,bottom:465,center:132}, {top:46,bottom:459,center:135},
  {top:56,bottom:461,center:130.5}, {top:53,bottom:463,center:127.5}
] as const;
const COLUMN: Record<Direction, number> = {south:0,north:1,west:2,east:3};
export function attackPoseFrame(direction: Direction, weapon: WeaponReadout, timing: WeaponTiming) {
  const row = weapon.phase === 'windup' ? 0 : weapon.phase === 'active' ? 1
    : weapon.phase === 'cooldown' && weapon.cooldownMsRemaining > timing.cooldownMs - 90 ? 2 : -1;
  return row < 0 ? null : row * 4 + COLUMN[direction];
}
export function preloadAttackPoses(scene: Phaser.Scene) {
  if (!scene.textures.exists(ATTACK_POSE_KEY)) scene.load.spritesheet(ATTACK_POSE_KEY, ATTACK_POSE_PATH, {frameWidth:256,frameHeight:512});
}
