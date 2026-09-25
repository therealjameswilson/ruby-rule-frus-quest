import {describe,it,expect} from 'vitest';
import {LIBRARY_ASSIGNMENTS} from '../game/libraryResearch';
import {libraryApproachCue} from './libraryApproachCue';
const index = LIBRARY_ASSIGNMENTS.findIndex(a=>a.library==='reagan');
const base = {libraryResearchActive:index};
const cue = (nearest: string|null, extra: Record<string,number>={})=>libraryApproachCue('NscLibraryScene','explore',nearest,{...base,...extra},'A');
describe('research room action cues',()=>{
 it('guides reading then verification without adding a gate',()=>{
  expect(cue(null)).toEqual({text:'WEST: READ THE GUIDE',badge:'!'});
  expect(cue('Source check')).toEqual({text:'VERIFY SOURCE',badge:'A'});
  expect(cue(null,{nscGuideRead_reagan_0:1})).toEqual({text:'EAST: VERIFY SOURCE',badge:'!'});
  expect(cue('North door')).toEqual({text:'EAST: VERIFY SOURCE',badge:'!'});
 });
 it('points through completed rooms and back to the lobby',()=>{
  expect(cue('Source check',{nscResearch_reagan:1})).toEqual({text:'CHECK SAVED FILE',badge:'A'});
  expect(cue(null,{nscResearch_reagan:1})).toEqual({text:'NORTH: NEXT ROOM',badge:'!'});
  expect(cue('North door',{nscResearch_reagan:1})).toEqual({text:'ENTER NEXT ROOM',badge:'A'});
  expect(cue('North door',{nscResearch_reagan:3,nscRoom_reagan:2})).toEqual({text:'RETURN TO LIBRARY',badge:'A'});
  expect(cue(null,{nscGuideRead_reagan_0:1,nscResearch_reagan:1,nscRoom_reagan:1})?.text).toBe('WEST: READ THE GUIDE');
 });
 it('routes each library production step to its actual corner',()=>{
  for(const [stage,text] of ['NW: FINDING AID','NE: COMPARE RECORDS','SE: SOURCE NOTE','SW: FILE PACKET','SOUTH: RETURN OUTSIDE'].entries()) {
   expect(libraryApproachCue('PresidentialLibraryScene','explore',null,{...base,libraryResearch_reagan:stage},'Z')).toEqual({text,badge:'!'});
  }
  expect(libraryApproachCue('PresidentialLibraryScene','explore','SOURCE NOTE',base,'Z')).toEqual({text:'WRITE SOURCE NOTE',badge:'Z'});
 });
 it('distinguishes saved research from the next task',()=>{
  const saved={...base,libraryResearch_reagan:1};
  expect(libraryApproachCue('PresidentialLibraryScene','explore','FINDING AID',saved,'Z')?.text).toBe('REVIEW SAVED STEP');
  expect(libraryApproachCue('PresidentialLibraryScene','explore','COMPARE RECORDS',saved,'Z')?.text).toBe('COMPARE RECORDS');
  expect(libraryApproachCue('PresidentialLibraryScene','explore','FILE PACKET',{...base,libraryResearch_reagan:4},'Z')?.text).toBe('REVIEW SAVED STEP');
 });
 it('does not override dialogue, choices, pause or unrelated scenes',()=>{
  for(const mode of ['dialog','choice','pause'])expect(libraryApproachCue('NscLibraryScene',mode,null,base,'A')).toBeNull();
  expect(libraryApproachCue('BlackVaultLairScene','explore',null,base,'A')).toBeNull();
 });
});
