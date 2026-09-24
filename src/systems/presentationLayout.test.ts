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
