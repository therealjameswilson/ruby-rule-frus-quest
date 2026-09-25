import {describe,it,expect} from 'vitest';
import {riverPresence} from './roomAmbience';
describe('river sound falloff',()=>{
  it('keeps northern gardens quiet and becomes strongest at the bridge',()=>{
    expect(riverPresence({y:128})).toBe(0);
    expect(riverPresence({y:168})).toBe(0);
    expect(riverPresence({y:194})).toBeCloseTo(.5);
    expect(riverPresence({y:220})).toBe(1);
    expect(riverPresence({y:230})).toBeGreaterThan(.8);
  });
  it('fades smoothly at the edge and rejects unknown locations',()=>{
    expect(riverPresence({y:168.1})).toBeLessThan(.0001);
    for(const p of [null,{y:NaN},{y:Infinity}])expect(riverPresence(p)).toBe(0);
  });
});
