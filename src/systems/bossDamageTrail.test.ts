import { describe, expect, it } from 'vitest';
import { BossDamageTrail } from './bossDamageTrail';

describe('boss damage readability', () => {
  it('holds recent damage briefly and settles without overshooting', () => {
    const trail = new BossDamageTrail(180);
    trail.set(124); trail.advance(180,180,false); expect(trail.value).toBe(180);
    trail.advance(100,180,false); expect(trail.value).toBe(144);
    trail.advance(1000,180,false); expect(trail.value).toBe(124);
  });
  it('preserves cumulative damage across closely spaced hits', () => {
    const trail = new BossDamageTrail(180);
    trail.set(152); trail.advance(100,180,false); trail.set(124);
    trail.advance(180,180,false); expect(trail.value).toBe(180);
    trail.advance(500,180,false); expect(trail.value).toBe(124);
  });
  it('is independent of frame partition and does not advance without elapsed play time', () => {
    const a = new BossDamageTrail(180), b = new BossDamageTrail(180);
    a.set(100); b.set(100); a.advance(280,180,false);
    for(let i=0;i<28;i++)b.advance(10,180,false);
    expect(a.value).toBeCloseTo(b.value); const before=b.value;
    b.advance(0,180,false); expect(b.value).toBe(before);
  });
  it('resets on a new phase or healing and honors reduced motion', () => {
    const trail = new BossDamageTrail(180);
    trail.set(20); trail.set(160,true); expect(trail.value).toBe(160);
    trail.set(180); expect(trail.value).toBe(180);
    trail.set(50); trail.advance(0,180,true); expect(trail.value).toBe(50);
  });
});
