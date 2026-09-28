import {describe,it,expect} from 'vitest';
import {readReviewNote,chooseRevisionSource,markRevisionPassage,revisionEvidence,applyManuscriptRevision,evaluateManuscriptRevision,manuscriptRevisionReadout,ORIGINAL_REVIEW_NOTE} from './manuscriptRevision';
const ready=():Record<string,number>=>({compilerSop_first_review:1,compilerSop_second_review:1,compilerRevisionRead:3,compilerRevisionSource:2,compilerRevisionLine:2});
describe('evidence-led manuscript revision',()=>{
 it('does not permit revision before both reviews or before reading their comments',()=>{
  const p=ready();delete p.compilerSop_second_review;expect(applyManuscriptRevision(p).ok).toBe(false);expect(p.compilerRevisionApplied).toBeUndefined();
  p.compilerSop_second_review=1;p.compilerRevisionRead=0;readReviewNote(p,1);expect(revisionEvidence(p).ok).toBe(false);readReviewNote(p,2);expect(revisionEvidence(p).ok).toBe(true);
 });
 it('requires a substantive follow-up passage rather than a title or receipt',()=>{
  const p=ready();chooseRevisionSource(p,3);markRevisionPassage(p,1);expect(applyManuscriptRevision(p).ok).toBe(false);
  chooseRevisionSource(p,2);markRevisionPassage(p,0);expect(applyManuscriptRevision(p).ok).toBe(false);markRevisionPassage(p,1);expect(applyManuscriptRevision(p).ok).toBe(true);
 });
 it('shows the actually marked passage, including unsuitable evidence, without endorsing it',()=>{
  const p=ready();
  expect(manuscriptRevisionReadout(p).markedEvidence).toEqual({locator:'Exercise E · page 2',line:2,text:'The resource shortfall continued; further assistance was requested.'});
  chooseRevisionSource(p,1);expect(manuscriptRevisionReadout(p).markedEvidence).toBeNull();
  markRevisionPassage(p,0);
  expect(manuscriptRevisionReadout(p).markedEvidence?.text).toBe('The report was forwarded to the responsible office.');
  expect(manuscriptRevisionReadout(p).applied).toBe(false);
  expect(applyManuscriptRevision(p).ok).toBe(false);
 });
 it('retains the original, persists the draft, and requires numbered backup',()=>{
  let p=ready();expect(evaluateManuscriptRevision(p).ok).toBe(false);applyManuscriptRevision(p);expect(evaluateManuscriptRevision(p).ok).toBe(false);
  p.compilerRevisionBackup=1;p=JSON.parse(JSON.stringify(p));expect(evaluateManuscriptRevision(p).ok).toBe(true);
  expect(manuscriptRevisionReadout(p).originalReviewCopy).toBe(ORIGINAL_REVIEW_NOTE);expect(manuscriptRevisionReadout(p).revisionCopy).toContain('shortfall continued');
  expect(p.compilerSop_revision).toBeUndefined();expect(p.compilerSop_submission).toBeUndefined();
 });
 it('invalidates an applied edit when its evidence changes but preserves same-source reopening',()=>{
  const p=ready();applyManuscriptRevision(p);chooseRevisionSource(p,2);expect(p.compilerRevisionApplied).toBe(1);
  chooseRevisionSource(p,1);expect(p.compilerRevisionLine).toBeUndefined();expect(p.compilerRevisionApplied).toBeUndefined();
  expect(manuscriptRevisionReadout(p).revisionCopy).toBe(ORIGINAL_REVIEW_NOTE);
 });
});
