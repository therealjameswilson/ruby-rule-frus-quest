import {afterEach,describe,it,expect,vi} from 'vitest';
import {readAudioMix,saveAudioMix} from './audioMix';
afterEach(()=>vi.unstubAllGlobals());
describe('persisted audio mix',()=>{
 it('uses defaults for unavailable storage',()=>{vi.stubGlobal('window',{});expect(readAudioMix()).toEqual({master:1,music:0.8,effects:1});expect(()=>saveAudioMix(readAudioMix())).not.toThrow();});
 it('clamps stored values and ignores invalid channels',()=>{vi.stubGlobal('window',{localStorage:{getItem:()=>'{"master":2,"music":-1,"effects":"loud"}'}});expect(readAudioMix()).toEqual({master:1,music:0,effects:1});});
 it('roundtrips independent levels',()=>{let value='{}';vi.stubGlobal('window',{localStorage:{getItem:()=>value,setItem:(_k:string,v:string)=>value=v}});saveAudioMix({master:0.75,music:0.25,effects:0.5});expect(readAudioMix()).toEqual({master:0.75,music:0.25,effects:0.5});});
});
