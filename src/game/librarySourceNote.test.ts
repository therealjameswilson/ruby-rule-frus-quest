import { expect, it } from 'vitest';
import { chooseSourceNoteField, toggleSourceNoteLog, sourceNoteReadout, evaluateSourceNote } from './librarySourceNote';
import { COMPARISON_SOURCE } from './libraryComparison';

it('rejects a neighboring date and an unexamined folder as the source of public remarks', () => {
  const p: Record<string,number> = {};
  chooseSourceNoteField(p,'kind',2);
  expect(evaluateSourceNote(p)).toMatchObject({ok:false,field:'kind'});
  chooseSourceNoteField(p,'kind',1);
  chooseSourceNoteField(p,'date',2);
  expect(evaluateSourceNote(p)).toMatchObject({ok:false,field:'date'});
  chooseSourceNoteField(p,'date',1);
  chooseSourceNoteField(p,'locator',2);
  expect(evaluateSourceNote(p)).toMatchObject({ok:false,field:'locator'});
  chooseSourceNoteField(p,'locator',1);
  chooseSourceNoteField(p,'scope',2);
  expect(evaluateSourceNote(p)).toMatchObject({ok:false,field:'scope'});
  chooseSourceNoteField(p,'scope',1);
  expect(evaluateSourceNote(p)).toMatchObject({ok:false,field:null});
  toggleSourceNoteLog(p,'lead');toggleSourceNoteLog(p,'followups');
  expect(evaluateSourceNote(p).ok).toBe(true);
  const note=sourceNoteReadout(p);
  expect(note.citation).not.toContain('RAC Box');
  expect(note.sourceUrl).toBe(COMPARISON_SOURCE);
  expect(note.researchLog).toHaveLength(3);
  expect(note.researchLog[0]).toContain('Unexamined lead');
  expect(note.researchLog[0]).toContain('RAC Box 6');
  expect(note.researchLog.slice(1).every(t=>t.startsWith('Pending:'))).toBe(true);
});

it('persists drafts without awarding a stage and refuses unsupported field values', () => {
  const p: Record<string,number> = {libraryResearch_v2_reagan:2};
  chooseSourceNoteField(p,'date',77);expect(sourceNoteReadout(p).fields.date).toBe(0);
  chooseSourceNoteField(p,'date',1);toggleSourceNoteLog(p,'lead');
  const json=JSON.stringify(p),restored=JSON.parse(json);
  expect(sourceNoteReadout(restored).fields.date).toBe(1);
  expect(sourceNoteReadout(restored).lead).toBe(true);
  expect(evaluateSourceNote(restored).ok).toBe(false);
  expect(JSON.stringify(restored)).toBe(json);
  expect(restored.libraryResearch_v2_reagan).toBe(2);
});

it('preserves Bush41 inventory leads without inventing document dates or contents', () => {
 const p: Record<string,number> = {};
 for(const field of ['kind','date','locator','scope'] as const)chooseSourceNoteField(p,field,1,'bush41');
 expect(evaluateSourceNote(p,'bush41').ok).toBe(false);
 toggleSourceNoteLog(p,'lead','bush41');toggleSourceNoteLog(p,'followups','bush41');
 expect(evaluateSourceNote(p,'bush41').ok).toBe(true);
 const note=sourceNoteReadout(p,'bush41');
 expect(note.heading).toContain('individual document dates pending');
 expect(note.citation).toContain('CF00715-001');expect(note.citation).toContain('CF00715-002');
 expect(note.qualification).toContain('unverified');expect(note.researchLog).toHaveLength(3);
 expect(evaluateSourceNote(p).ok).toBe(false);
 chooseSourceNoteField(p,'date',2,'bush41');
 expect(evaluateSourceNote(p,'bush41')).toMatchObject({ok:false,field:'date'});
 expect(evaluateSourceNote(p,'unknown').ok).toBe(false);
});
