import {describe,expect,it} from 'vitest';
import {attackPoseFrame} from './attackPoses';
import type {WeaponReadout,WeaponTiming} from '../systems/weaponState';
describe('directional attack presentation',()=>{
 const timing={cooldownMs:220} as WeaponTiming;
 const weapon=(phase:WeaponReadout['phase'],cooldownMsRemaining=0)=>({phase,cooldownMsRemaining} as WeaponReadout);
 it('keeps each facing through anticipation, impact and early recovery',()=>{
  for(const [i,direction] of (['south','north','west','east'] as const).entries()){
   expect(attackPoseFrame(direction,weapon('windup'),timing)).toBe(i);
   expect(attackPoseFrame(direction,weapon('active'),timing)).toBe(i+4);
   expect(attackPoseFrame(direction,weapon('cooldown',180),timing)).toBe(i+8);
  }
 });
 it('returns to ordinary movement after 90ms of recovery without changing cooldown',()=>{
  expect(attackPoseFrame('east',weapon('cooldown',131),timing)).toBe(11);
  expect(attackPoseFrame('east',weapon('cooldown',130),timing)).toBeNull();
  expect(attackPoseFrame('east',weapon('idle'),timing)).toBeNull();
 });
});
