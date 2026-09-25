import {describe,expect,it} from 'vitest';
import {cardinalStick} from './cardinalStick';
describe('cardinal analog stick',()=>{
 it('does not reuse a direction opposite to the current quadrant',()=>{
  expect(cardinalStick(.8,.8,'up')).toBe('right');
  expect(cardinalStick(-.8,.8,'right')).toBe('left');
  expect(cardinalStick(-.7,-.8,'down')).toBe('up');
  expect(cardinalStick(.8,-.7,'left')).toBe('right');
 });
 it('retains a compatible direction through small diagonal jitter',()=>{
  for(const x of [.71,.69,.73,.68])expect(cardinalStick(x,.7,'down')).toBe('down');
  expect(cardinalStick(.95,.5,'down')).toBe('right');
 });
 it('stops on release and ignores invalid samples',()=>{
  expect(cardinalStick(.1,.1,'left')).toBeNull();
  expect(cardinalStick(0,0,'down')).toBeNull();
  expect(cardinalStick(NaN,.8,'up')).toBeNull();
 });
});
