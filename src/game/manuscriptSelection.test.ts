import {describe,it,expect} from 'vitest';
import {SELECTION_PACKETS,evaluateManuscriptSelection, manuscriptSelectionReadout, toggleSelectionPacket} from './manuscriptSelection';
import {CHAPTER_EXHIBITS} from './chapterAssembly';
describe('manuscript selection desk',()=>{
 it('carries the same locators and passages into the next chapter exercise',()=>{
  const evidence=SELECTION_PACKETS[0].evidence;
  expect(evidence).toHaveLength(CHAPTER_EXHIBITS.length);
  for(const exhibit of CHAPTER_EXHIBITS){
   const sample=evidence.find(record=>record.label.includes(exhibit.locator));
   expect(sample).toBeDefined();expect(exhibit.lines).toContain(sample!.excerpt);
  }
  expect(evidence[2].excerpt).toContain('resource shortfall');
 });
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
 it('distinguishes printed evidence from retained source material independently of page compliance',()=>{
  const p:Record<string,number>={};
  toggleSelectionPacket(p,'routine');
  expect(manuscriptSelectionReadout(p).coverage.every(row=>!row.inManuscript)).toBe(true);
  toggleSelectionPacket(p,'decision');
  const readout=manuscriptSelectionReadout(p);
  expect(readout.remaining).toBe(-100);
  expect(readout.coverage.every(row=>row.inManuscript)).toBe(true);
  expect(readout.coverage.map(row=>row.locator)).toEqual(CHAPTER_EXHIBITS.map(row=>row.locator));
  toggleSelectionPacket(p,'decision');
  expect(manuscriptSelectionReadout(p).coverage.every(row=>!row.inManuscript)).toBe(true);
  expect(evaluateManuscriptSelection(p).message).toContain('daily summaries do not replace');
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

it('rejects a budget-compliant approval-only narrative and reports its real coverage',()=>{
 const p:Record<string,number>={};toggleSelectionPacket(p,'approval');
 expect(manuscriptSelectionReadout(p).pages).toBe(1180);
 expect(manuscriptSelectionReadout(p).coverage.filter(r=>r.inManuscript).map(r=>r.id)).toEqual(['B']);
 expect(evaluateManuscriptSelection(p)).toMatchObject({ok:false});
 expect(evaluateManuscriptSelection(p).message).toContain('resource shortfall');
 toggleSelectionPacket(p,'routine');expect(manuscriptSelectionReadout(p).remaining).toBe(40);
 expect(evaluateManuscriptSelection(p).ok).toBe(false);
});
it('rejects duplicate approval evidence at the limit and accepts a corrected draft',()=>{
 const p:Record<string,number>={};toggleSelectionPacket(p,'decision');toggleSelectionPacket(p,'approval');
 expect(manuscriptSelectionReadout(p).remaining).toBe(0);
 expect(evaluateManuscriptSelection(p).message).toContain('selected twice');
 const restored=JSON.parse(JSON.stringify(p));expect(evaluateManuscriptSelection(restored).ok).toBe(false);
 toggleSelectionPacket(restored,'approval');expect(evaluateManuscriptSelection(restored).ok).toBe(true);
 expect(restored.compilerSop_selection).toBeUndefined();
});
