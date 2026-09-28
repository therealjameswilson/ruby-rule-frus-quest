import { describe, expect, it } from 'vitest';
import { createControllerResume } from './controllerResume';
const pad = (buttons: number[] = [], axes = [0, 0]) => ({connected:true, axes, buttons:Array.from({length:17},(_,i)=>({pressed:buttons.includes(i)}))});
describe('controller return from background', () => {
  it('requires release before A or Start and rearms for each return', () => {
    const resume=createControllerResume();
    for(const button of [0,9]) {
      resume.begin();
      expect(resume.poll([pad([button])])).toBe(false);
      expect(resume.poll([pad()])).toBe(false);
      expect(resume.poll([pad([button])])).toBe(true);
      expect(resume.poll([pad([button])])).toBe(false);
    }
  });
  it('does not resume on drift, movement, other buttons or reconnection with a held action', () => {
    const resume=createControllerResume();
    expect(resume.poll([pad([], [0.7,0])])).toBe(false);
    expect(resume.poll([pad([0])])).toBe(false);
    expect(resume.poll([pad()])).toBe(false);
    expect(resume.poll([pad([1])])).toBe(false);
    expect(resume.poll([])).toBe(false);
    expect(resume.poll([pad([0])])).toBe(false);
    expect(resume.poll([null,pad()])).toBe(false);
    expect(resume.poll([null,pad([9])])).toBe(true);
  });
});
