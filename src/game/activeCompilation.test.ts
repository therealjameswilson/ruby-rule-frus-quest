import { describe, it, expect } from 'vitest';
import { ACTIVE_COMPILATION, assignCompilerVolume, assignedDossier, assignedResearchReady, activeCompilationReadout } from './activeCompilation';
import { fileLibraryStage, libraryStage, libraryAssignment } from './libraryResearch';
import { fileNscStage, nscStage, nscDungeon } from './nscResearch';
import { COMPILER_TASKS, submitCompilerTask } from './compilerMission';
import { choiceLayout } from '../systems/choiceLayout';

describe('active volume compiler route', () => {
  it.each(ACTIVE_COMPILATION)('$library uses a current volume and the same NSC source trail', d => {
    expect(d.status).toBe('Being Researched');
    expect(libraryAssignment(d.library)?.volumeId).toBe(d.volumeId);
    expect(nscDungeon(d.library)?.handle).toBe(d.handle);
    for(const q of d.questions){
      const layout=choiceLayout(q.question,[{key:'A',label:q.correct},{key:'B',label:q.wrong}],6);
      expect(layout.top).toBeGreaterThanOrEqual(30);
      expect(layout.top+layout.height).toBeLessThanOrEqual(210);
      expect(layout.questionText.replace(/\n/g,' ')).toBe(q.question);
      expect(layout.rows[0].text.replace(/\n/g,' ')).toBe(`[A] ${q.correct}`);
      expect(layout.rows[1].text.replace(/\n/g,' ')).toBe(`[B] ${q.wrong}`);
    }
  });
  it.each(ACTIVE_COMPILATION)('$library carries earned research into both reviews without granting release', d => {
    let p:Record<string,number>={};
    expect(assignCompilerVolume(p,d.library)).toBe(true);
    expect(assignCompilerVolume(p,'clinton')).toBe(false);
    for(const t of COMPILER_TASKS.slice(0,2))expect(submitCompilerTask(p,t.id,t.correct).ok).toBe(true);
    expect(submitCompilerTask(p,'selection','decision').ok).toBe(false);
    expect(fileLibraryStage(p,d.library,0,false)).toBe(false);
    expect(fileLibraryStage(p,d.library,2,true)).toBe(false);
    for(let i=0;i<4;i++)expect(fileLibraryStage(p,d.library,i,true)).toBe(true);
    p=JSON.parse(JSON.stringify(p));
    expect(assignedDossier(p)?.library).toBe(d.library);
    expect(assignedResearchReady(p)).toBe(true);
    expect(activeCompilationReadout(p).packets.find(a=>a.library===d.library)?.receipts).toHaveLength(4);
    expect(fileLibraryStage(p,d.library,3,true)).toBe(false);
    for(const t of COMPILER_TASKS.slice(2))expect(submitCompilerTask(p,t.id,t.correct).ok).toBe(true);
    expect(p.compilerSop_submission).toBe(1);
    expect(p.finalGatePublished).toBeUndefined();
  });
  it('keeps old packets and independent NSC checks without relabeling earned evidence', () => {
    const p:Record<string,number>={libraryResearch_reagan:4,nscResearch_reagan:3};
    expect(libraryStage(p,'reagan')).toBe(0);expect(nscStage(p,'reagan')).toBe(0);
    expect(assignedResearchReady(p)).toBe(true); // no retroactive lock on legacy unassigned runs
    assignCompilerVolume(p,'reagan');
    for(let i=0;i<3;i++)expect(fileNscStage(p,'reagan',i,true)).toBe(true);
    expect(assignedResearchReady(p)).toBe(false); // optional wing is not the manuscript packet
    expect(p.libraryResearch_reagan).toBe(4);
    expect(assignCompilerVolume({},'invalid')).toBe(false);
  });
});
