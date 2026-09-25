// Requires a Vite development server (default: npx vite --host 127.0.0.1 --port 5217).
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const out=process.env.FRUS_QA_OUT??'/tmp/audio-mix';await mkdir(out,{recursive:true});
const browser=await chromium.launch({args:['--disable-audio-output','--autoplay-policy=no-user-gesture-required']});
try {
 const p=await browser.newPage(),errors=[],results=[];
 p.on('pageerror',e=>errors.push(String(e)));
 await p.goto(process.env.FRUS_QA_AUDIO_URL??'http://127.0.0.1:5217/');
 await p.waitForFunction(()=>window.game?.scene.getScenes(true).length>0);await p.waitForTimeout(700);
 await p.evaluate(async()=>{
  // Development-server module import exercises the actual audio engine, not a duplicate synthesis model.
  const {retroAudio}=await import('/src/systems/audio.ts');window.qaAudio=retroAudio;
  for(const scene of window.game.scene.getScenes(true))scene.scene.pause();
  await retroAudio.unlock();
 });
 for(const mode of ['music','effects','combat',...(process.argv.includes('--stress')?['stress']:[])]){
  const result=await p.evaluate(async mode=>{
   const audio=window.qaAudio;audio.stopEffects();audio.stopMusic();
   audio.setChannelVolume('master',1);audio.setChannelVolume('music',mode==='effects'?0:mode==='stress'?1:.8);audio.setChannelVolume('effects',mode==='music'?0:1);
   audio.startMusic('DanneBoss',{forceRestart:true});await new Promise(r=>setTimeout(r,400));
   const ctx=audio.context,chunks=[];const processor=ctx.createScriptProcessor(4096,2,2),silent=ctx.createGain();silent.gain.value=0;
   // A muted diagnostic branch captures master output; it does not feed audio back into the mix.
   const output=audio.outputNode??audio.masterGain;output.connect(processor);processor.connect(silent);silent.connect(ctx.destination);
   processor.onaudioprocess=e=>chunks.push([e.inputBuffer.getChannelData(0).slice(),e.inputBuffer.getChannelData(1).slice()]);
   let interval=null,n=0;const pending=[];
   if(mode!=='music')interval=setInterval(()=>{
    audio.toolWindup('red_pencil');pending.push(setTimeout(()=>audio.toolHit('red_pencil'),140));
    pending.push(setTimeout(()=>audio.egoBoltFire(),350));
    if(n++%3===2)pending.push(setTimeout(()=>audio.playerHurt(),450));
    if(mode==='stress'){audio.toolHit(['stapler','citation_stamp','review_folder'][n%3]);audio.bossHit();}
   },mode==='stress'?300:700);
   await new Promise(r=>setTimeout(r,6000));
   if(interval)clearInterval(interval);pending.forEach(clearTimeout);
   processor.onaudioprocess=null;output.disconnect(processor);processor.disconnect();silent.disconnect();
   const frames=chunks.reduce((n,c)=>n+c[0].length,0),wav=new ArrayBuffer(44+frames*4),v=new DataView(wav);
   const text=(at,s)=>{for(let i=0;i<s.length;i++)v.setUint8(at+i,s.charCodeAt(i));};
   text(0,'RIFF');v.setUint32(4,36+frames*4,true);text(8,'WAVE');text(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,2,true);
   v.setUint32(24,ctx.sampleRate,true);v.setUint32(28,ctx.sampleRate*4,true);v.setUint16(32,4,true);v.setUint16(34,16,true);text(36,'data');v.setUint32(40,frames*4,true);
   let at=44,peak=0,sum=0,clipped=0;
   for(const c of chunks)for(let i=0;i<c[0].length;i++)for(let channel=0;channel<2;channel++){
    const sample=c[channel][i];peak=Math.max(peak,Math.abs(sample));sum+=sample*sample;if(Math.abs(sample)>=1)clipped++;
    v.setInt16(at,Math.round(Math.max(-1,Math.min(1,sample))*32767),true);at+=2;
   }
   const bytes=new Uint8Array(wav);let binary='';for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));
   const rms=Math.sqrt(sum/(frames*2));
   return {mode,seconds:frames/ctx.sampleRate,sampleRate:ctx.sampleRate,peak,rms,peakDb:20*Math.log10(peak),rmsDb:20*Math.log10(rms),clipped,audio:btoa(binary)};
  },mode);
  await writeFile(`${out}/${mode}.wav`,Buffer.from(result.audio,'base64'));delete result.audio;
  assert(result.seconds>5);assert(result.peak>0);assert.equal(result.clipped,0);results.push(result);console.log(JSON.stringify(result));
 }
 const cancellation=await p.evaluate(async()=>{const a=window.qaAudio;a.stopEffects();a.toolWindup('review_folder');a.toolHit('stapler');const before=a.foley.size;a.setChannelVolume('effects',0);const after=a.foley.size;a.toolHit('red_pencil');const whileMuted=a.foley.size;await new Promise(r=>setTimeout(r,250));return {before,after,whileMuted,settled:a.foley.size};});
 assert(cancellation.before>=2);assert.equal(cancellation.after,0);assert.equal(cancellation.whileMuted,0);assert.equal(cancellation.settled,0);
 assert.deepEqual(errors,[]);await writeFile(`${out}/result.json`,JSON.stringify({scope:'Six-second synthesized combat stimulus. Digital levels only; not listening approval.',results,cancellation,errors},null,2));
}finally{await browser.close();}
