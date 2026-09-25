import { describe, expect, it } from 'vitest';
import { computePresentationLayout } from './pixelPerfect';

describe('high-density viewport fitting', () => {
  for (const [width,height] of [[374,828],[828,374],[1920,1080],[200,180],[359,759]]) {
    for (const dpr of [1,2,2.625,3]) {
      it(`fills ${width}x${height} at DPR ${dpr} without cropping or changing aspect`, () => {
        const view={x:8,y:12,width,height,dpr};const r=computePresentationLayout(view);
        expect(r.width/r.height).toBeCloseTo(256/240);
        expect(r.width).toBeLessThanOrEqual(width+1e-8);
        expect(r.height).toBeLessThanOrEqual(height+1e-8);
        expect(Math.min(width-r.width,height-r.height)).toBeCloseTo(0);
        expect(r.x+r.width/2).toBeCloseTo(view.x+width/2);
        expect(r.y+r.height/2).toBeCloseTo(view.y+height/2);
      });
    }
  }
});

describe('portrait play surface composition', () => {
  it.each([1, 2, 2.625, 3])('centers the game and dock inside asymmetric safe areas at DPR %s', dpr => {
    const view = {x: 18, y: 47, width: 354, height: 763, dpr};
    const plain = computePresentationLayout(view);
    const docked = computePresentationLayout(view, true);
    expect(docked.portraitDockEligible).toBe(true);
    expect(docked.width).toBe(plain.width);
    expect(docked.height).toBe(plain.height);
    expect(docked.cssZoom).toBe(plain.cssZoom);
    expect(docked.y + (docked.height + 180) / 2).toBeCloseTo(view.y + view.height / 2);
    expect(docked.y).toBeGreaterThanOrEqual(view.y);
    expect(docked.y + docked.height + 180).toBeLessThanOrEqual(view.y + view.height);
    expect(computePresentationLayout(view, false)).toEqual(plain);
  });
  it.each([[359,651],[828,374],[1264,704]])('leaves short portrait, landscape and desktop unchanged (%sx%s)', (width,height) => {
    const view = {x:8,y:8,width,height,dpr:3};
    expect(computePresentationLayout(view,true)).toEqual(computePresentationLayout(view));
    expect(computePresentationLayout(view,true).portraitDockEligible).toBe(false);
  });
  it('uses the unshifted fit for a stable eligibility threshold', () => {
    const view={x:8,y:8,width:320,height:668,dpr:3};
    expect(computePresentationLayout(view,true).portraitDockEligible).toBe(true);
    expect(computePresentationLayout({...view,height:667},true).portraitDockEligible).toBe(false);
  });
});
