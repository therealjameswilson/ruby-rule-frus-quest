import { describe,it,expect } from 'vitest';
import { NSC_DUNGEONS,nscDungeon,nscStage,fileNscStage,nscQuestion } from './nscResearch';
import { LIBRARY_ASSIGNMENTS } from './libraryResearch';
import { gameState,createGameSaveData,restoreGameSaveData,setSceneState } from './state';
describe('NSC holdings dungeons',()=>{
 it('covers every NSC-era library without inventing an FDR NSC',()=>{
  expect(NSC_DUNGEONS.map(d=>d.library).sort()).toEqual(LIBRARY_ASSIGNMENTS.filter(a=>a.library!=='fdr').map(a=>a.library).sort());
  expect(nscDungeon('fdr')).toBeUndefined();
  for(const d of NSC_DUNGEONS){expect(new URL(d.source).protocol).toBe('https:');expect(d.handle.length).toBeGreaterThan(20);expect(d.challenge.correct).not.toBe(d.challenge.wrong);}
 });
 it('requires sequential correct work and isolates library progress',()=>{
  const p:Record<string,number>={};
  expect(fileNscStage(p,'reagan',1,true)).toBe(false);
  expect(fileNscStage(p,'reagan',0,false)).toBe(false);
  expect(fileNscStage(p,'fdr',0,true)).toBe(false);
  for(let r=0;r<3;r++)expect(fileNscStage(p,'reagan',r,true)).toBe(true);
  expect(fileNscStage(p,'reagan',2,true)).toBe(false);
  expect(nscStage(p,'reagan')).toBe(3);expect(nscStage(p,'carter')).toBe(0);
 });
 it('keeps exact citation leads and avoids a clearance claim',()=>{
  expect(nscDungeon('nixon')?.handle).toContain('Box 765');expect(nscDungeon('carter')?.handle).toContain('Box 14');
  for(const d of NSC_DUNGEONS)expect(nscQuestion(d.library,2).correct).toContain('lead');
 });
 it('restores the wing, chamber and independent NSC progress',()=>{
  setSceneState('NscLibraryScene','explore','SOURCE TRAIL');
  gameState.sceneProgress.libraryResearchActive=8;gameState.sceneProgress.nscRoom_reagan=1;gameState.sceneProgress.nscResearch_reagan=1;
  const save=createGameSaveData();expect(restoreGameSaveData(save)).toBe('NscLibraryScene');
  expect(gameState.sceneProgress.nscRoom_reagan).toBe(1);expect(nscStage(gameState.sceneProgress,'reagan')).toBe(1);
 });
});
