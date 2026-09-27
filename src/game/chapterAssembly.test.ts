import {describe,it,expect} from 'vitest';
import {chapterOrder,moveChapterExhibit,evaluateChapterChronology,selectChapterSource,highlightChapterLine,evaluateChapterEvidence,toggleChapterComponent,evaluateChapterPacket,chapterAssemblyReadout,advanceChapterAssembly} from './chapterAssembly';
const ready=()=>({compilerAssemblyOrder:123,compilerAssemblyStep:2,compilerAssemblySource:3,compilerAssemblyLine:2,compilerAssemblyContents:7});
describe('chapter assembly through document handling',()=>{
 it('orders events rather than write-up dates, with reversible moves and no lost records',()=>{
  const p:Record<string,number>={};expect(chapterOrder(p)).toEqual(['C','A','B']);expect(evaluateChapterChronology(p).ok).toBe(false);
  expect(moveChapterExhibit(p,'C',-1)).toBe(false);expect(moveChapterExhibit(p,'C',1)).toBe(true);expect(moveChapterExhibit(p,'C',1)).toBe(true);
  expect(chapterOrder(p)).toEqual(['A','B','C']);expect(evaluateChapterChronology(p).ok).toBe(true);expect(moveChapterExhibit(p,'C',1)).toBe(false);
  moveChapterExhibit(p,'A',1);expect(evaluateChapterChronology(p).ok).toBe(false);expect(new Set(chapterOrder(p)).size).toBe(3);
 });
 it('requires the correct source and passage, and clears highlights when changing sources',()=>{
  const p:Record<string,number>={};expect(highlightChapterLine(p,1)).toBe(false);
  selectChapterSource(p,'A');highlightChapterLine(p,1);expect(evaluateChapterEvidence(p).ok).toBe(false);
  selectChapterSource(p,'C');expect(p.compilerAssemblyLine).toBeUndefined();highlightChapterLine(p,0);expect(evaluateChapterEvidence(p).ok).toBe(false);
  highlightChapterLine(p,1);expect(evaluateChapterEvidence(p).ok).toBe(true);selectChapterSource(p,'B');expect(p.compilerAssemblyLine).toBeUndefined();
 });
 it('requires all packet components and both evidence conditions at final submission',()=>{
  const p:Record<string,number>=ready();expect(evaluateChapterPacket(p).ok).toBe(true);
  for(const bit of [1,2,4] as const){toggleChapterComponent(p,bit);expect(evaluateChapterPacket(p).ok).toBe(false);toggleChapterComponent(p,bit);}
  p.compilerAssemblyOrder=312;expect(evaluateChapterPacket(p).ok).toBe(false);p.compilerAssemblyOrder=123;p.compilerAssemblyLine=1;expect(evaluateChapterPacket(p).ok).toBe(false);
 });
 it('saves drafts without awarding review, submission, or publication',()=>{
  let p:Record<string,number>={compilerAssemblyOrder:123};expect(advanceChapterAssembly(p).ok).toBe(true);expect(chapterAssemblyReadout(p).step).toBe(1);
  selectChapterSource(p,'C');highlightChapterLine(p,1);expect(advanceChapterAssembly(p).ok).toBe(true);
  for(const bit of [1,2,4] as const)toggleChapterComponent(p,bit);
  p=JSON.parse(JSON.stringify(p));expect(advanceChapterAssembly(p).ok).toBe(true);expect(chapterAssemblyReadout(p).components.every(c=>c.attached)).toBe(true);
  expect(p.compilerSop_backup).toBeUndefined();expect(p.compilerSop_first_review).toBeUndefined();expect(p.finalGatePublished).toBeUndefined();
 });
 it('recovers malformed ordering and sends stale drafts to their first unmet prerequisite',()=>{
  expect(chapterOrder({compilerAssemblyOrder:111})).toEqual(['C','A','B']);
  expect(chapterAssemblyReadout({...ready(),compilerAssemblyOrder:312}).step).toBe(0);
  expect(chapterAssemblyReadout({...ready(),compilerAssemblySource:1}).step).toBe(1);
  const p={compilerSop_backup:1};expect(chapterAssemblyReadout(p).chapterSubmitted).toBe(true);expect(p).toEqual({compilerSop_backup:1});
 });
});
