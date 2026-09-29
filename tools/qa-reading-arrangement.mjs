// Live audio scheduling fixture; requires a fresh Vite server to avoid HMR module duplication.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const out=process.env.FRUS_QA_OUT??'/tmp/frus-reading-arrangement';await mkdir(out,{recursive:true});
const browser=await chromium.launch({args:['--disable-audio-output']});
try{
 const page=await browser.newPage({viewport:{width:375,height:667},hasTouch:true}),errors=[];
 page.on('pageerror',e=>errors.push(String(e)));
 await page.goto((process.env.FRUS_QA_URL??'http://127.0.0.1:5236/')+'?scene=NetworkScene');
 await page.waitForFunction(()=>window.game?.scene.isActive('NetworkScene'));
 await page.touchscreen.tap(10,10);
 const report=await page.evaluate(async()=>{
  const {retroAudio:a}=await import('/src/systems/audio.ts');
  for(const scene of window.game.scene.getScenes(true))scene.scene.pause();
  await a.unlock();a.stopEffects();a.stopMusic();
  const results=[];
  for(const reading of [false,true]){
   const release=reading?a.holdReadingMix():()=>{};
   a.startMusic('NetworkScene',{forceRestart:true});
   const voice=a.scoreVoice,play=voice.play,pulse=voice.pulse,parts=[],pulses=[];
   voice.play=function(...args){parts.push(args[4]);return play.apply(this,args);};
   voice.pulse=function(...args){pulses.push(args[0]);return pulse.apply(this,args);};
   const c=a.context,chunks=[],node=c.createScriptProcessor(4096,2,2),silence=c.createGain();silence.gain.value=0;
   a.outputNode.connect(node);node.connect(silence);silence.connect(c.destination);
   node.onaudioprocess=e=>chunks.push([e.inputBuffer.getChannelData(0).slice(),e.inputBuffer.getChannelData(1).slice()]);
   await new Promise(r=>setTimeout(r,8000));
   node.onaudioprocess=null;a.outputNode.disconnect(node);node.disconnect();silence.disconnect();
   const frames=chunks.reduce((n,x)=>n+x[0].length,0),buffer=new ArrayBuffer(44+frames*4),v=new DataView(buffer);
   const txt=(at,s)=>{for(let i=0;i<s.length;i++)v.setUint8(at+i,s.charCodeAt(i));};
   txt(0,'RIFF');v.setUint32(4,buffer.byteLength-8,true);txt(8,'WAVE');txt(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,2,true);v.setUint32(24,c.sampleRate,true);v.setUint32(28,c.sampleRate*4,true);v.setUint16(32,4,true);v.setUint16(34,16,true);txt(36,'data');v.setUint32(40,frames*4,true);
   let peak=0,sum=0,at=44;
   for(const block of chunks)for(let i=0;i<block[0].length;i++)for(let ch=0;ch<2;ch++){const s=block[ch][i];peak=Math.max(peak,Math.abs(s));sum+=s*s;v.setInt16(at,Math.max(-1,Math.min(1,s))*32767,true);at+=2;}
   const bytes=new Uint8Array(buffer);let binary='';for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));
   const step=a.getDebugState().musicStep,duringParts=[...new Set(parts)],duringPulses=pulses.length;release();
   await new Promise(r=>setTimeout(r,600));
   results.push({reading,duringParts,duringPulses,partsAfterResume:[...new Set(parts)],pulsesAfterResume:pulses.length-duringPulses,step,continuedStep:a.getDebugState().musicStep,readingReleased:!a.getDebugState().readingMixActive,peak,rms:Math.sqrt(sum/(frames*2)),wav:btoa(binary)});
   a.stopMusic();
  }
  return results;
 });
 for(const r of report){assert(r.peak>0&&r.peak<1);assert(r.rms>0);assert(r.continuedStep>r.step);assert(r.readingReleased);await writeFile(`${out}/${r.reading?'reading':'exploration'}.wav`,Buffer.from(r.wav,'base64'));delete r.wav;}
 // Post-release events are included: assert exact reading suppression separately below.
 const suppression=await page.evaluate(async()=>{
  const {retroAudio:a}=await import('/src/systems/audio.ts');const release=a.holdReadingMix();a.startMusic('NetworkScene',{forceRestart:true});
  const v=a.scoreVoice,play=v.play,pulse=v.pulse,parts=[];let beats=0;
  v.play=function(...args){parts.push(args[4]);return play.apply(this,args);};v.pulse=function(...args){beats++;return pulse.apply(this,args);};
  await new Promise(r=>setTimeout(r,2200));const result={parts,beats,step:a.getDebugState().musicStep};release();a.stopMusic();return result;
 });
 assert(suppression.parts.length>0);assert(suppression.parts.every(p=>['pad','bass'].includes(p)));assert.equal(suppression.beats,0);assert.deepEqual(errors,[]);
 await page.evaluate(()=>{for(const s of window.game.scene.getScenes(true))s.scene.resume();});
 await page.screenshot({path:out+'/network.png'});
 await page.evaluate(async()=>{const {retroAudio:a}=await import('/src/systems/audio.ts');a.startMusic('NetworkScene');window.game.scene.getScene('NetworkScene').ledgerChoice.show(undefined,()=>{},()=>{});});
 assert(await page.evaluate(async()=>(await import('/src/systems/audio.ts')).retroAudio.getDebugState().readingMixActive));
 await page.waitForTimeout(300);await page.screenshot({path:out+'/reading-desk.png'});
 await page.locator('.chronology-desk [data-focus-key=leave]').tap();
 assert(!await page.evaluate(async()=>(await import('/src/systems/audio.ts')).retroAudio.getDebugState().readingMixActive));
 await writeFile(out+'/result.json',JSON.stringify({report,suppression,nativeDeskAcquiresAndReleases:true,errors,limitations:'Live instrument and waveform checks; not human listening or physical-device verification.'},null,2));console.log('PASS reading harmony, silent percussion, uninterrupted timeline and live recordings');
}finally{await browser.close();}
