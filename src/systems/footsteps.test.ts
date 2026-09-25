import { describe, expect, it } from 'vitest';
import { footstepSamples, footstepSurface } from './footsteps';

describe('original footstep samples', () => {
  it.each(['carpet','stone','gravel','grass'] as const)('%s has gentle finite contact and silent edges', surface => {
    for (const rate of [22050,44100,48000]) {
      const data=footstepSamples(surface,rate);
      expect(data[0]).toBe(0);expect(Math.abs(data[data.length-1])).toBe(0);
      const peak=Math.max(...data.map(Math.abs));
      expect(peak).toBeGreaterThan(.002);expect(peak).toBeLessThan(.05);
      expect(data.every(Number.isFinite)).toBe(true);
    }
  });
  it('matches the outdoor path, lawn and bridge',()=>{
    expect(footstepSurface('ResearchWorldScene',{x:128,y:180})).toBe('gravel');
    expect(footstepSurface('ResearchWorldScene',{x:80,y:128})).toBe('gravel');
    expect(footstepSurface('ResearchWorldScene',{x:80,y:180})).toBe('grass');
    expect(footstepSurface('ResearchWorldScene',{x:128,y:220})).toBe('stone');
  });
  it('uses distinct surface textures',()=>{
    expect(footstepSurface('ResearchWorldScene')).toBe('gravel');
    expect(footstepSurface('OfficeScene')).toBe('carpet');
    expect(footstepSurface('NaraStacksScene')).toBe('stone');
    expect(footstepSamples('stone',44100)).not.toEqual(footstepSamples('carpet',44100));
  });
});
