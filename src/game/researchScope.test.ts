import { describe, it, expect } from 'vitest';
import { inResearchScope } from './researchScope';
import { ACTIVE_COMPILATION } from './activeCompilation';
import { LIBRARY_ASSIGNMENTS, libraryAssignment, libraryStage, fileLibraryStage } from './libraryResearch';
import { NSC_DUNGEONS, nscStage, fileNscStage } from './nscResearch';
import { INITIAL_DOCUMENT_CANDIDATES } from './documentWorkflow';
import collections from '../../public/assets/research-world/frus-collections.json';
describe('1989–2008 repository scope', () => {
  it('includes boundary years and rejects missing, reversed or out-of-period coverage', () => {
    for(const dates of [[1989,1989],[2008,2008],[1989,2008]]) expect(inResearchScope(dates)).toBe(true);
    for(const dates of [null,[],[1988,1990],[2008,2009],[2001,1999]]) expect(inResearchScope(dates)).toBe(false);
  });
  it('keeps training record dates in period', () => {
    for(const d of INITIAL_DOCUMENT_CANDIDATES){const year=Number(d.date.slice(0,4));expect(inResearchScope([year,year])).toBe(true);}
  });
  it('covers every active dossier, wing and field-guide lead', () => {
    for(const entry of [...ACTIVE_COMPILATION,...NSC_DUNGEONS,...collections]) expect(inResearchScope(entry.researchYears)).toBe(true);
    expect(LIBRARY_ASSIGNMENTS.filter(a=>libraryAssignment(a.library)).map(a=>a.library)).toEqual(['bush41','clinton','bush43']);
  });
  it('preserves save indices but cannot revive retired packets with old receipts', () => {
    expect(LIBRARY_ASSIGNMENTS[8].library).toBe('reagan');
    expect(LIBRARY_ASSIGNMENTS[9].library).toBe('bush41');
    for(const entry of LIBRARY_ASSIGNMENTS.filter(a=>!libraryAssignment(a.library))){
      const id=entry.library,p={['libraryResearch_v2_'+id]:4,['libraryResearch_'+id]:4,['nscResearch_v2_'+id]:3,['nscResearch_'+id]:3};
      expect(libraryStage(p,id)).toBe(0);expect(nscStage(p,id)).toBe(0);
      expect(fileLibraryStage(p,id,0,true)).toBe(false);expect(fileNscStage(p,id,0,true)).toBe(false);
    }
  });
});
