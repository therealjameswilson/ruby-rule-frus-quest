import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const out=process.env.FRUS_QA_OUT??'/tmp/paper-foley';await mkdir(out,{recursive:true});
const b=await chromium.launch({args:['--disable-audio-output']});
try{
 const p=await b.newPage();const errors=[];p.on('pageerror',e=>errors.push(String(e)));
 await p.goto(process.env.FRUS_QA_AUDIO_URL??'http://127.0.0.1:5212/');
 const result=await p.evaluate(async()=>{
  const {playPaperFoley}=await import('/src/systems/paperFoley.ts');const reports=[];
  for(const action of ['pickup','file','stress','cancel']){
   const c=new OfflineAudioContext(1,22050,22050),gain=c.createGain(),compressor=c.createDynamicsCompressor();
   gain.gain.value=3.4;compressor.threshold.value=-8;compressor.knee.value=6;compressor.ratio.value=12;compressor.attack.value=.003;compressor.release.value=.18;
   gain.connect(compressor);compressor.connect(c.destination);let ended=0;
   const stops=[];for(let i=0;i<(action==='stress'?8:1);i++)stops.push(playPaperFoley(c,gain,action==='pickup'?'pickup':'file',()=>ended++));
   let cancellation=null;if(action==='cancel')cancellation=c.suspend(.02).then(()=>{stops[0]();stops[0]();return c.resume();});
   const rendered=c.startRendering();if(cancellation)await cancellation;const samples=(await rendered).getChannelData(0);
   let peak=0,sum=0,tail=0,clipped=0;for(let i=0;i<samples.length;i++){peak=Math.max(peak,Math.abs(samples[i]));sum+=samples[i]**2;if(Math.abs(samples[i])>=1)clipped++;if(i>22050*.3)tail=Math.max(tail,Math.abs(samples[i]));}
   reports.push({action,peak,rms:Math.sqrt(sum/samples.length),tail,clipped,ended,samples:Array.from(samples)});
  }
  return reports;
 });
 for(const r of result){
  assert.equal(r.clipped,0);assert(r.peak>0&&r.peak<.95);assert.equal(r.tail,0);assert.equal(r.ended,r.action==='stress'?8:1);
  const wav=Buffer.alloc(44+r.samples.length*2);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(22050,24);wav.writeUInt32LE(44100,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(r.samples.length*2,40);
  r.samples.forEach((v,i)=>wav.writeInt16LE(Math.round(Math.max(-1,Math.min(1,v))*32767),44+i*2));await writeFile(`${out}/${r.action}.wav`,wav);delete r.samples;
 }
 assert.notEqual(result[0].peak,result[1].peak);assert.deepEqual(errors,[]);await writeFile(`${out}/result.json`,JSON.stringify({scope:'Offline synthesis levels and source cleanup, not human listening approval',result,errors},null,2));console.log(JSON.stringify(result));
}finally{await b.close();}
