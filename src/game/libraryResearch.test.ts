import { describe, expect, it } from 'vitest';
import { LIBRARY_ASSIGNMENTS, libraryStage, fileLibraryStage } from './libraryResearch';
import { RESEARCH_LANDMARKS } from './researchWorld';
import { gameState, createGameSaveData, restoreGameSaveData, setSceneState } from './state';
describe('presidential library research dungeons',()=>{
  it('maps every presidential library to a cited volume',()=>{
    const libraries=RESEARCH_LANDMARKS.filter(l=>l.zone>=3);
    expect(LIBRARY_ASSIGNMENTS.map(a=>a.library).sort()).toEqual(libraries.map(l=>l.id).sort());
    for(const a of LIBRARY_ASSIGNMENTS){expect(a.source).toMatch(/^https:\/\/history.state.gov\/historicaldocuments\/frus/);expect(a.task.length).toBeGreaterThan(30);}
  });
  it('rejects wrong answers, out-of-order work and duplicate completion',()=>{
    const p:Record<string,number>={};
    expect(fileLibraryStage(p,'reagan',3,true)).toBe(false);
    expect(fileLibraryStage(p,'reagan',0,false)).toBe(false);
    for(let i=0;i<4;i++)expect(fileLibraryStage(p,'reagan',i,true)).toBe(true);
    expect(libraryStage(p,'reagan')).toBe(4);
    expect(fileLibraryStage(p,'reagan',3,true)).toBe(false);
    expect(libraryStage(p,'clinton')).toBe(0);
    expect(fileLibraryStage(p,'fake',0,true)).toBe(false);
  });
  it('distinguishes background stops from contemporary volume research',()=>{
    expect(LIBRARY_ASSIGNMENTS.filter(a=>a.backgroundOnly).map(a=>a.library)).toEqual(['jfk','lbj']);
    expect(LIBRARY_ASSIGNMENTS.find(a=>a.library==='truman')?.status).toBe('Planned');
    expect(LIBRARY_ASSIGNMENTS.find(a=>a.library==='nixon')?.status).toContain('Uruguay');
  });
  it('restores the library scene, assignment and partial progress',()=>{
    setSceneState('PresidentialLibraryScene','explore','SOURCE NOTE');
    gameState.sceneProgress.libraryResearchActive=8;gameState.sceneProgress.libraryResearch_reagan=2;
    const save=createGameSaveData();
    expect(restoreGameSaveData(save)).toBe('PresidentialLibraryScene');
    expect(gameState.sceneProgress.libraryResearchActive).toBe(8);
    expect(libraryStage(gameState.sceneProgress,'reagan')).toBe(2);
  });
});
