import {describe,it,expect} from 'vitest';
import {evaluateManuscriptSelection, manuscriptSelectionReadout, toggleSelectionPacket} from './manuscriptSelection';
describe('manuscript selection desk',()=>{
 it('requires substantive evidence even when a smaller packet fits',()=>{
  const p:Record<string,number>={};expect(evaluateManuscriptSelection(p).ok).toBe(false);
  toggleSelectionPacket(p,'routine');expect(manuscriptSelectionReadout(p).pages).toBe(1280);expect(evaluateManuscriptSelection(p).ok).toBe(false);
 });
 it('keeps the page limit and policy evidence distinct; moving a file is reversible',()=>{
  const p:Record<string,number>={};toggleSelectionPacket(p,'decision');expect(evaluateManuscriptSelection(p).ok).toBe(true);
  toggleSelectionPacket(p,'routine');expect(manuscriptSelectionReadout(p).remaining).toBe(-100);expect(evaluateManuscriptSelection(p).ok).toBe(false);
  toggleSelectionPacket(p,'routine');expect(manuscriptSelectionReadout(p).pages).toBe(1320);expect(evaluateManuscriptSelection(p).ok).toBe(true);
  expect(p.compilerSop_selection).toBeUndefined();expect(p.finalGatePublished).toBeUndefined();
 });
 it('reports the decision packet already earned in older completed saves',()=>{
  const progress={compilerSop_selection:1,compilerSopDocumentPages:1320};
  expect(manuscriptSelectionReadout(progress).pages).toBe(1320);
  expect(progress).toEqual({compilerSop_selection:1,compilerSopDocumentPages:1320});
 });
 it('round-trips unfinished arrangement without awarding progress',()=>{
  const p:Record<string,number>={};toggleSelectionPacket(p,'decision');const restored=JSON.parse(JSON.stringify(p));
  expect(manuscriptSelectionReadout(restored)).toEqual(manuscriptSelectionReadout(p));expect(restored.compilerSop_selection).toBeUndefined();
  expect(manuscriptSelectionReadout(restored).annotationCountsTowardLimit).toBe(false);
 });
});
