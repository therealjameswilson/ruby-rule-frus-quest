import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');const out=process.env.FRUS_QA_OUT??'/tmp/score-release';await mkdir(out,{recursive:true});
const browser=await chromium.launch({args:['--disable-audio-output']});try{
 const p=await browser.newPage();const errors=[];p.on('pageerror',e=>errors.push(String(e)));await p.goto(process.env.FRUS_QA_AUDIO_URL??'http://127.0.0.1:5212/');
 const renders=await p.evaluate(async()=>{
  const {ScoreVoice}=await import('/src/systems/scoreVoice.ts');const results=[];
  for(const mode of ['normal','early','reverb']){
   const early=mode==='early';
   const rate=24000,c=new OfflineAudioContext(2,rate*2,rate),voice=new ScoreVoice(c,c.destination);
   if(mode==='reverb')voice.play(220,.02,.1,.12,'bell');
   else{voice.play(220,.02,1.8,.12,'pad');voice.play(440,1.4,.2,.1,'bell');voice.pulse(0,.1,.2);voice.pulse(1,1.5,.2);}
   const releaseAt=early?.04:1;let afterStop;
   const paused=c.suspend(releaseAt).then(()=>{voice.dispose();voice.dispose();afterStop=voice.activeSourceCount;voice.play(880,1.7,.1,.2,'lead');voice.pulse(0,1.8,.2);return c.resume();});
   const rendering=c.startRendering();await paused;const buffer=await rendering;
   const data=buffer.getChannelData(0);const rms=(start,end)=>{const part=data.slice(Math.floor(start*rate),Math.floor(end*rate));return Math.sqrt(part.reduce((n,v)=>n+v*v,0)/part.length);};
   const tail=data.slice(Math.ceil((releaseAt+.15)*rate));let peak=0,tailPeak=0;for(const v of data)peak=Math.max(peak,Math.abs(v));for(const v of tail)tailPeak=Math.max(tailPeak,Math.abs(v));
   results.push({mode,early,releaseAt,peak,tailPeak,pre:early?null:rms(.94,.98),start:early?null:rms(1,1.015),end:early?null:rms(1.045,1.06),sourcesAtDispose:afterStop,sourcesAfterRender:voice.activeSourceCount});
  }
  return results;
 });
 for(const r of renders){assert(r.peak<1);assert.equal(r.tailPeak,0);assert.equal(r.sourcesAfterRender,0);if(r.mode==='normal'){assert(r.start>0);assert(r.end<r.start*.4,'Retirement should fade rather than truncate');}}
 await p.mouse.click(5,5);await p.evaluate(async()=>{window.qaAudio=(await import('/src/systems/audio.ts')).retroAudio;await window.qaAudio.unlock();window.qaAudio.startMusic('OfficeScene');});
 await p.waitForTimeout(400);
 const transition=await p.evaluate(async()=>{const a=window.qaAudio,old=a.scoreVoice;a.startMusic('NetworkScene');await new Promise(r=>setTimeout(r,150));return{oldSources:old.activeSourceCount,newMusic:a.getDebugState().musicTimerActive,newTheme:a.getDebugState().currentThemeKey};});assert.equal(transition.oldSources,0);assert(transition.newMusic);assert.equal(transition.newTheme,'openNetRouting');
 const suspended=await p.evaluate(async()=>{const {ScoreVoice}=await import('/src/systems/scoreVoice.ts');const c=new AudioContext();await c.resume();const v=new ScoreVoice(c,c.destination);v.play(220,c.currentTime+.01,1,.1,'pad');await c.suspend();v.dispose();await new Promise(r=>setTimeout(r,150));const before=v.activeSourceCount;await c.resume();await new Promise(r=>setTimeout(r,200));const after=v.activeSourceCount;await c.close();return{before,after};});assert(suspended.before>0);assert.equal(suspended.after,0);
 await p.evaluate(()=>window.qaAudio.toggle());await p.waitForTimeout(150);assert(!await p.evaluate(()=>window.qaAudio.getDebugState().musicTimerActive));assert.deepEqual(errors,[]);
 await writeFile(`${out}/result.json`,JSON.stringify({renders,transition,suspended,muteStops:true,errors,limitations:['Automated waveform/lifecycle analysis; not human listening']},null,2));console.log(JSON.stringify({renders,transition,suspended,errors}));
}finally{await browser.close();}
