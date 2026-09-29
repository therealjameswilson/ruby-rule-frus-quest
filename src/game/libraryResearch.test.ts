import { describe, expect, it } from 'vitest';
import { LIBRARY_ASSIGNMENTS, libraryAssignment, libraryStage, fileLibraryStage } from './libraryResearch';
import { RESEARCH_LANDMARKS } from './researchWorld';
import { gameState, createGameSaveData, restoreGameSaveData, setSceneState } from './state';
describe('presidential library research dungeons',()=>{
  it('preserves landmark slots while only offering in-period research',()=>{
    const libraries=RESEARCH_LANDMARKS.filter(l=>l.zone>=3);
    expect(LIBRARY_ASSIGNMENTS.map(a=>a.library).sort()).toEqual(libraries.map(l=>l.id).sort());
    expect(LIBRARY_ASSIGNMENTS.filter(a=>libraryAssignment(a.library)).map(a=>a.library)).toEqual(['bush41','clinton','bush43']);
  });
  it('rejects wrong answers, out-of-order work and duplicate completion',()=>{
    const p:Record<string,number>={};
    expect(fileLibraryStage(p,'bush41',3,true)).toBe(false);
    expect(fileLibraryStage(p,'bush41',0,false)).toBe(false);
    for(let i=0;i<4;i++)expect(fileLibraryStage(p,'bush41',i,true)).toBe(true);
    expect(libraryStage(p,'bush41')).toBe(4);
    expect(fileLibraryStage(p,'bush41',3,true)).toBe(false);
    expect(libraryStage(p,'clinton')).toBe(0);
    expect(fileLibraryStage(p,'fake',0,true)).toBe(false);
  });
  it('distinguishes background stops from contemporary volume research',()=>{
    expect(LIBRARY_ASSIGNMENTS.filter(a=>a.backgroundOnly).map(a=>a.library)).toEqual(['fdr','truman','eisenhower','jfk','lbj','nixon','ford','carter','reagan']);
    expect(LIBRARY_ASSIGNMENTS.find(a=>a.library==='truman')?.status).toBe('No verified in-period packet');
    expect(LIBRARY_ASSIGNMENTS.find(a=>a.library==='nixon')?.status).toBe('No verified in-period packet');
  });
  it('restores the library scene, assignment and partial progress',()=>{
    setSceneState('PresidentialLibraryScene','explore','SOURCE NOTE');
    gameState.sceneProgress.libraryResearchActive=9;gameState.sceneProgress.libraryResearch_v2_bush41=2;
    const save=createGameSaveData();
    expect(restoreGameSaveData(save)).toBe('PresidentialLibraryScene');
    expect(gameState.sceneProgress.libraryResearchActive).toBe(9);
    expect(libraryStage(gameState.sceneProgress,'bush41')).toBe(2);
  });
});
