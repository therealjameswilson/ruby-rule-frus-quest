import {describe,it,expect} from 'vitest';
import {DANNE_DISGUISES,disguiseIndex} from './danneDisguises';
describe('DANN-E disguises',()=>{
 it('cycles through all twenty unique movies and wraps',()=>{
  expect(new Set(DANNE_DISGUISES.map(d=>d.id)).size).toBe(20);
  expect(new Set(Array.from({length:20},(_,i)=>disguiseIndex(i))).size).toBe(20);
  expect(disguiseIndex(20)).toBe(0);expect(disguiseIndex(-1)).toBe(19);expect(disguiseIndex(NaN)).toBe(0);
 });
 it('has nonempty visible body bounds for consistent grounded display',()=>{
  for(const d of DANNE_DISGUISES){const [l,t,r,b]=d.bounds;expect(r).toBeGreaterThan(l);expect(b).toBeGreaterThan(t);}
 });
});
