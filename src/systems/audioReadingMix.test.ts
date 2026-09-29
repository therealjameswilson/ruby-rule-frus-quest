import {beforeEach,afterEach,it,expect,vi} from 'vitest';
vi.mock('../game/state',()=>({setAudioStatus:vi.fn()}));
vi.mock('../input/InputState',()=>({addInputGestureListener:vi.fn()}));
let audio:typeof import('./audio').retroAudio;
let target:ReturnType<typeof vi.fn>;
beforeEach(async()=>{
 vi.resetModules();vi.stubGlobal('window',{});audio=(await import('./audio')).retroAudio;
 target=vi.fn();Object.assign(audio,{context:{currentTime:10,state:'running'},musicGain:{gain:{value:.8,cancelScheduledValues:vi.fn(),setTargetAtTime:target}}});
});
afterEach(()=>vi.unstubAllGlobals());
it('attenuates music, keeps player preferences, and restores only after the final owner closes',()=>{
 const first=audio.holdReadingMix(),second=audio.holdReadingMix();
 expect(target.mock.lastCall?.[0]).toBeCloseTo(.36);expect(audio.getMix().music).toBe(.8);
 first();expect(target.mock.lastCall?.[0]).toBeCloseTo(.36);const calls=target.mock.calls.length;first();expect(target).toHaveBeenCalledTimes(calls);
 second();expect(target.mock.lastCall?.[0]).toBe(.8);expect(audio.getDebugState().readingMixActive).toBe(false);
});
it('honors a music preference change made while reading, including silence',()=>{
 const release=audio.holdReadingMix();audio.setChannelVolume('music',.6);expect(target.mock.lastCall?.[0]).toBeCloseTo(.27);
 audio.setChannelVolume('music',0);expect(target.mock.lastCall?.[0]).toBe(0);release();expect(target.mock.lastCall?.[0]).toBe(0);
});
it('preserves focus across an audio context that has not been created yet',()=>{
 Object.assign(audio,{context:null,musicGain:null});const release=audio.holdReadingMix();expect(audio.getDebugState().readingMixActive).toBe(true);release();expect(audio.getDebugState().readingMixActive).toBe(false);expect(target).not.toHaveBeenCalled();
});

it('keeps the harmonic timeline but drops melody and percussion until the last reading owner closes',async()=>{
 const {ORIGINAL_SCORE}=await import('./originalScore');
 const play=vi.fn(),pulse=vi.fn();
 const runtime=audio as unknown as {scoreVoice:unknown;musicStep:number;playMusicStep:(theme:typeof ORIGINAL_SCORE[string],at:number)=>void};
 runtime.scoreVoice={play,pulse};runtime.musicStep=0;
 const a=audio.holdReadingMix(),b=audio.holdReadingMix();
 runtime.playMusicStep(ORIGINAL_SCORE.danneCombat,10);
 expect(play).toHaveBeenCalled();
 expect(play.mock.calls.every(call=>['pad','bass'].includes(call[4]))).toBe(true);
 expect(pulse).not.toHaveBeenCalled();expect(runtime.musicStep).toBe(1);
 a();runtime.playMusicStep(ORIGINAL_SCORE.danneCombat,10.3);expect(pulse).not.toHaveBeenCalled();
 b();runtime.playMusicStep(ORIGINAL_SCORE.danneCombat,10.6);expect(pulse).toHaveBeenCalledWith(2,10.6,ORIGINAL_SCORE.danneCombat.stepMs/1000);
 expect(runtime.musicStep).toBe(3);
});
