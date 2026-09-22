import { beforeEach, describe, expect, it } from 'vitest';
import { discoveryCount, RESEARCH_LANDMARKS, RESEARCH_ZONES, researchZone } from './researchWorld';
import { createGameSaveData, gameState, resetGameState, restoreGameSaveData, setSceneState } from './state';
beforeEach(()=>resetGameState());
describe('outdoor research exploration',()=>{
  it('gives every landmark a distinct atlas frame, stable discovery key and real-source link',()=>{
    expect(RESEARCH_LANDMARKS).toHaveLength(16);
    expect(new Set(RESEARCH_LANDMARKS.map(l=>l.id)).size).toBe(16);
    expect(new Set(RESEARCH_LANDMARKS.map(l=>l.frame)).size).toBe(16);
    for(const l of RESEARCH_LANDMARKS){expect(RESEARCH_ZONES[l.zone]).toBeDefined();expect(l.source).toMatch(/^https:\/\//);}
  });
  it('keeps DC walking routes reversible and library regions reachable by rail',()=>{
    const opposite={west:'east',east:'west',north:'south',south:'north'} as const;
    RESEARCH_ZONES.forEach((z,id)=>{
      for(const [direction,reverse] of Object.entries(opposite)){
        const next=(z as Record<string,unknown>)[direction];
        if(typeof next==='number') expect((RESEARCH_ZONES[next] as Record<string,unknown>)[reverse]).toBe(id);
      }
    });
    expect(RESEARCH_LANDMARKS.every(l=>l.zone>=0&&l.zone<=6)).toBe(true);
  });
  it('restores region and discoveries without granting production stamps',()=>{
    setSceneState('ResearchWorldScene','explore','EXPLORE THE OUTDOORS');
    gameState.sceneProgress.researchWorldZone=6;
    gameState.sceneProgress.researchVisited_bush41=1;
    const save=createGameSaveData();resetGameState();
    expect(restoreGameSaveData(save)).toBe('ResearchWorldScene');
    expect(gameState.sceneProgress.researchWorldZone).toBe(6);
    expect(discoveryCount(gameState.sceneProgress)).toBe(1);
    expect(gameState.processStamps).toEqual([]);
  });
  it('counts revisits once and ignores unknown discovery keys',()=>{
    const progress={researchVisited_fdr:1,researchVisited_fake:1};
    expect(discoveryCount(progress)).toBe(1);progress.researchVisited_fdr=1;expect(discoveryCount(progress)).toBe(1);
  });
  it('recovers from invalid or absent saved regions',()=>{
    for(const input of [undefined,-1,7,NaN,Infinity,1.5])expect(researchZone(input)).toBe(1);
    for(let i=0;i<7;i++)expect(researchZone(i)).toBe(i);
  });
});
