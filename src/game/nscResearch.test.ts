import { describe,it,expect } from 'vitest';
import { NSC_DUNGEONS,nscDungeon,nscStage,fileNscStage,nscQuestion } from './nscResearch';
import { LIBRARY_ASSIGNMENTS } from './libraryResearch';
import { gameState,createGameSaveData,restoreGameSaveData,setSceneState } from './state';
describe('NSC holdings dungeons',()=>{
 it('covers every NSC-era library without inventing an FDR NSC',()=>{
  expect(NSC_DUNGEONS.map(d=>d.library).sort()).toEqual(LIBRARY_ASSIGNMENTS.filter(a=>a.researchYears!==null).map(a=>a.library).sort());
  expect(nscDungeon('fdr')).toBeUndefined();
  for(const d of NSC_DUNGEONS){expect(new URL(d.source).protocol).toBe('https:');expect(d.handle.length).toBeGreaterThan(20);expect(d.challenge.correct).not.toBe(d.challenge.wrong);}
 });
 it('requires sequential correct work and isolates library progress',()=>{
  const p:Record<string,number>={};
  expect(fileNscStage(p,'bush41',1,true)).toBe(false);
  expect(fileNscStage(p,'bush41',0,false)).toBe(false);
  expect(fileNscStage(p,'fdr',0,true)).toBe(false);
  for(let r=0;r<3;r++)expect(fileNscStage(p,'bush41',r,true)).toBe(true);
  expect(fileNscStage(p,'bush41',2,true)).toBe(false);
  expect(nscStage(p,'bush41')).toBe(3);expect(nscStage(p,'carter')).toBe(0);
 });
 it('keeps exact citation leads and avoids a clearance claim',()=>{
  expect(nscDungeon('nixon')).toBeUndefined();expect(nscDungeon('carter')).toBeUndefined();
  for(const d of NSC_DUNGEONS)expect(nscQuestion(d.library,2).correct).not.toMatch(/ready for publication|fully cleared/);
 });
 it('restores the wing, chamber and independent NSC progress',()=>{
  setSceneState('NscLibraryScene','explore','SOURCE TRAIL');
  gameState.sceneProgress.libraryResearchActive=9;gameState.sceneProgress.nscRoom_bush41=1;gameState.sceneProgress.nscResearch_v2_bush41=1;
  const save=createGameSaveData();expect(restoreGameSaveData(save)).toBe('NscLibraryScene');
  expect(gameState.sceneProgress.nscRoom_bush41).toBe(1);expect(nscStage(gameState.sceneProgress,'bush41')).toBe(1);
 });
});
