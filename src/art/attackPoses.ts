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
export type AttackPoseSheet = {
  key: string;
  path: string;
  // Match the idle sprite height sampled by characterGrounding; avoid growing on attack.
  height?: number;
  flipFrames?: readonly number[];
  // Uneven source gutters use atlas frames without altering the generated PNG.
  rowEdges?: readonly [number, number, number, number];
  columnEdges?: readonly [number, number, number, number, number];
  poses: readonly {top:number;bottom:number;center:number}[];
};
export const ATTACK_POSE_SHEETS: Record<string, AttackPoseSheet> = {
  compiler_ada_hd: {height:42,key:'ada-attack-v1',path:'assets/characters/compilers/combat/ada-attack-v1.png',poses:[
    {top:51,bottom:491,center:133.0},
    {top:52,bottom:489,center:142.5},
    {top:54,bottom:490,center:133.5},
    {top:51,bottom:490,center:140.0},
    {top:37,bottom:475,center:139.0},
    {top:37,bottom:473,center:141.5},
    {top:40,bottom:475,center:133.5},
    {top:40,bottom:475,center:136.5},
    {top:30,bottom:470,center:132.0},
    {top:30,bottom:467,center:137.0},
    {top:29,bottom:470,center:134.5},
    {top:31,bottom:470,center:135.5}
  ]},
  compiler_clara_hd: {height:42,flipFrames:[1],key:'clara-attack-v1',path:'assets/characters/compilers/combat/clara-attack-v1.png',columnEdges:[0, 260, 500, 771, 1024],rowEdges:[0, 571, 1020, 1536],poses:[
    {top:141,bottom:543,center:137.5},
    {top:144,bottom:541,center:137.0},
    {top:144,bottom:543,center:146.0},
    {top:142,bottom:545,center:121.5},
    {top:26,bottom:424,center:138.5},
    {top:31,bottom:422,center:136.5},
    {top:29,bottom:424,center:149.0},
    {top:28,bottom:427,center:120.0},
    {top:22,bottom:418,center:140.5},
    {top:25,bottom:418,center:132.5},
    {top:23,bottom:419,center:147.5},
    {top:23,bottom:422,center:122.0}
  ]},
  compiler_robin_hd: {height:42,key:'robin-attack-v1',path:'assets/characters/compilers/combat/robin-attack-v1.png',columnEdges:[0, 262, 498, 767, 1024],rowEdges:[0, 529, 1006, 1536],poses:[
    {top:80,bottom:482,center:141.5},
    {top:82,bottom:482,center:124.5},
    {top:80,bottom:482,center:132.0},
    {top:80,bottom:482,center:133.5},
    {top:48,bottom:439,center:140.5},
    {top:48,bottom:438,center:121.0},
    {top:48,bottom:439,center:137.5},
    {top:48,bottom:439,center:124.5},
    {top:38,bottom:443,center:140.0},
    {top:41,bottom:442,center:123.5},
    {top:38,bottom:443,center:136.5},
    {top:39,bottom:443,center:133.0}
  ]},
  compiler_quinn_hd: {height:41,key:'quinn-attack-v1',path:'assets/characters/compilers/combat/quinn-attack-v1.png',columnEdges:[0, 257, 494, 765, 1024],rowEdges:[0, 541, 1021, 1536],poses:[
    {top:89,bottom:505,center:133.0},
    {top:97,bottom:501,center:129.5},
    {top:95,bottom:507,center:130.0},
    {top:95,bottom:507,center:136.5},
    {top:35,bottom:447,center:132.0},
    {top:43,bottom:448,center:128.0},
    {top:39,bottom:450,center:131.5},
    {top:38,bottom:450,center:133.5},
    {top:31,bottom:454,center:128.5},
    {top:37,bottom:449,center:134.5},
    {top:37,bottom:454,center:127.5},
    {top:38,bottom:454,center:137.0}
  ]},
  compiler_hd: {key:ATTACK_POSE_KEY,path:ATTACK_POSE_PATH,poses:ATTACK_POSES},
  compiler_maya_hd: {height:40,key:'maya-attack-v1',path:'assets/characters/compilers/combat/maya-attack-v1.png',poses:[
    {top:85,bottom:487,center:134.5},
    {top:85,bottom:480,center:131.5},
    {top:92,bottom:487,center:118.0},
    {top:91,bottom:487,center:137.5},
    {top:53,bottom:453,center:133.5},
    {top:54,bottom:448,center:135.0},
    {top:60,bottom:454,center:132.0},
    {top:60,bottom:454,center:124.0},
    {top:25,bottom:423,center:134.0},
    {top:25,bottom:418,center:135.0},
    {top:32,bottom:423,center:118.0},
    {top:32,bottom:423,center:137.0}
  ]}
};
export function preloadAttackPoses(scene: Phaser.Scene) {
  for(const sheet of Object.values(ATTACK_POSE_SHEETS)) {
    if (scene.textures.exists(sheet.key)) continue;
    if (sheet.rowEdges || sheet.columnEdges) {
      const edges = sheet.rowEdges ?? [0,512,1024,1536];
      const columns = sheet.columnEdges ?? [0,256,512,768,1024];
      scene.load.once(`filecomplete-image-${sheet.key}`, () => {
        const texture = scene.textures.get(sheet.key);
        for (let row=0; row<3; row++) for (let column=0; column<4; column++) {
          texture.add(row*4+column, 0, columns[column], edges[row], columns[column+1]-columns[column], edges[row+1]-edges[row]);
        }
      });
      scene.load.image(sheet.key, sheet.path);
    } else scene.load.spritesheet(sheet.key, sheet.path, {frameWidth:256,frameHeight:512});
  }
}
