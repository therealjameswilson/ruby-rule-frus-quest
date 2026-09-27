import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {completeLibraryRequest} from './library-request-actions.mjs';
import {completeLibraryComparison} from './library-comparison-actions.mjs';
import {completeLibrarySourceNote} from './library-source-note-actions.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const out=process.env.FRUS_QA_OUT??'/tmp/frus-desk-foley';await mkdir(out,{recursive:true});
const browser=await chromium.launch({args:['--disable-audio-output','--autoplay-policy=no-user-gesture-required']});
try {
 const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto('http://127.0.0.1:5217/?scene=PresidentialLibraryScene');await page.waitForFunction(()=>window.game?.scene.isActive('PresidentialLibraryScene'));await page.waitForSelector('#boot-loader',{state:'hidden'});
 const rendered=await page.evaluate(async()=>{
  const {playPaperFoley}=await import('/src/systems/paperFoley.ts');const results=[];
  for(const action of ['mark','turn','pickup','file','rapid-marks']){
   const context=new OfflineAudioContext(1,48000,48000);let ended=0;
   if(action==='rapid-marks')for(let n=0;n<8;n++)playPaperFoley(context,context.destination,'mark',()=>ended++);
   else playPaperFoley(context,context.destination,action,()=>ended++);
   const buffer=await context.startRendering(),samples=buffer.getChannelData(0);let peak=0,sum=0,clipped=0;
   for(const x of samples){peak=Math.max(peak,Math.abs(x));sum+=x*x;if(Math.abs(x)>=1)clipped++;}
   const wav=new ArrayBuffer(44+samples.length*2),v=new DataView(wav),txt=(at,t)=>[...t].forEach((c,i)=>v.setUint8(at+i,c.charCodeAt(0)));
   txt(0,'RIFF');v.setUint32(4,36+samples.length*2,true);txt(8,'WAVE');txt(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,48000,true);v.setUint32(28,96000,true);v.setUint16(32,2,true);v.setUint16(34,16,true);txt(36,'data');v.setUint32(40,samples.length*2,true);
   samples.forEach((s,i)=>v.setInt16(44+i*2,Math.round(Math.max(-1,Math.min(1,s))*32767),true));let binary='';for(const b of new Uint8Array(wav))binary+=String.fromCharCode(b);
   results.push({action,peak,rms:Math.sqrt(sum/samples.length),clipped,ended,wav:btoa(binary)});
  }return results;
 });
 for(const r of rendered){await writeFile(`${out}/${r.action}.wav`,Buffer.from(r.wav,'base64'));delete r.wav;assert(r.peak>0);assert.equal(r.clipped,0);assert.equal(r.ended,r.action==='rapid-marks'?8:1);}
 const levels=Object.fromEntries(rendered.map(r=>[r.action,r]));assert(levels.mark.rms<levels.turn.rms);assert(levels.turn.rms<levels.pickup.rms);assert(levels.pickup.rms<levels.file.rms);
 await page.evaluate(async()=>{
  const {retroAudio}=await import('/src/systems/audio.ts');window.qaAudio=retroAudio;window.qaCues=[];await retroAudio.unlock();
  for(const name of ['annotatePaper','turnPaper','paperPickup','fileDocket']){const original=retroAudio[name].bind(retroAudio);retroAudio[name]=(...args)=>{window.qaCues.push(name);return original(...args);};}
 });
 const open=async(x,y,selector)=>{await page.evaluate(([x,y])=>window.game.scene.getScene('PresidentialLibraryScene').player.setPosition(x,y),[x,y]);await page.waitForTimeout(200);await page.keyboard.press('Space');await page.waitForSelector(selector);assert(await page.evaluate(()=>window.qaAudio.getDebugState().readingMixActive));};
 await open(48,118,'.library-request');await completeLibraryRequest(page);
 await open(202,118,'.library-comparison');await completeLibraryComparison(page);
 await open(202,186,'.library-source-note');await completeLibrarySourceNote(page);
 await open(48,186,'.library-packet');
 for(const id of [1,2,3]){await page.locator(`[data-part="${id}"]`).click();await page.locator('[data-attach]').click();}
 await page.screenshot({path:out+'/packet-feedback.png'});
 await page.locator('.library-packet .manuscript-submit').click();await page.waitForTimeout(450);
 const live=await page.evaluate(()=>({cues:window.qaCues,reading:window.qaAudio.getDebugState().readingMixActive,remaining:window.qaAudio.foley.size}));
 assert.equal(live.reading,false);assert.equal(live.remaining,0);for(const name of ['annotatePaper','turnPaper','paperPickup','fileDocket'])assert(live.cues.includes(name));assert.equal(live.cues.filter(n=>n==='fileDocket').length,4);
 const cancellation=await page.evaluate(async()=>{const a=window.qaAudio;a.annotatePaper();a.turnPaper();const before=a.foley.size;a.setChannelVolume('effects',0);a.annotatePaper();a.turnPaper();const after=a.foley.size;await new Promise(r=>setTimeout(r,100));return{before,after,settled:a.foley.size};});
 assert(cancellation.before>=2);assert.equal(cancellation.after,0);assert.equal(cancellation.settled,0);assert.deepEqual(errors,[]);
 await writeFile(out+'/result.json',JSON.stringify({scope:'Original foley waveform levels, actual desk routing, reading mix lifecycle and effects mute; not subjective listening approval.',rendered,live,cancellation,errors},null,2));console.log(JSON.stringify({rendered,live,cancellation,errors}));
}finally{await browser.close();}
