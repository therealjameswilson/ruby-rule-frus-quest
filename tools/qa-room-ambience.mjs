import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const base=process.env.FRUS_QA_URL ?? 'http://127.0.0.1:5173/';
const out=process.env.FRUS_QA_OUT ?? '/tmp/room-ambience';await mkdir(out,{recursive:true});
const browser=await chromium.launch({args:['--disable-audio-output']});
try {
const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e)));
await page.goto(new URL('?scene=OfficeScene',base).href);await page.waitForFunction(()=>window.game?.scene.isActive('OfficeScene'));
const rendered=await page.evaluate(async()=>{
 const {RoomAmbience}=await import('/src/systems/roomAmbience.ts');const reports=[];
 for(const profile of ['office','archive','outdoors','equipment','vault']){
  const c=new OfflineAudioContext(2,22050*31,22050);const room=new RoomAmbience(c,c.destination,profile);
  const audio=await c.startRendering();let peak=0,sum=0,stereo=0;const l=audio.getChannelData(0),r=audio.getChannelData(1);
  for(let i=0;i<l.length;i++){peak=Math.max(peak,Math.abs(l[i]),Math.abs(r[i]));sum+=l[i]**2+r[i]**2;stereo+=Math.abs(l[i]-r[i]);}
  reports.push({profile,peak,rms:Math.sqrt(sum/(l.length*2)),stereoDifference:stereo/l.length,sources:room.activeSourceCount});
 }
 const c=new OfflineAudioContext(2,22050*3,22050),room=new RoomAmbience(c,c.destination,'outdoors');
 const stopped=c.suspend(1).then(()=>{room.dispose();room.dispose();return c.resume();});const render=c.startRendering();await stopped;const audio=await render;
 const after=audio.getChannelData(0).slice(22050*2);reports.push({cleanup:true,active:room.activeSourceCount,tailPeak:Math.max(...after.map(Math.abs))});
 return reports;
});
await writeFile(`${out}/renders.json`,JSON.stringify(rendered,null,2));
console.log(JSON.stringify(rendered,null,2));
for(const r of rendered){if(r.cleanup){assert.equal(r.active,0);assert.equal(r.tailPeak,0);}else{assert(r.peak<.03&&r.peak>.001);assert(r.rms<.01&&r.rms>.0001);assert(r.stereoDifference>.0001);}}
await page.mouse.click(5,5);
await page.evaluate(async()=>{window.qaAudio=(await import('/src/systems/audio.ts')).retroAudio;await window.qaAudio.unlock();window.qaAudio.startMusic('OfficeScene');});
const debug=()=>page.evaluate(()=>window.qaAudio.getDebugState());
assert.equal((await debug()).ambienceProfile,'office');
await page.evaluate(()=>window.qaAudio.startMusic('GuideScene'));assert.equal((await debug()).ambienceProfile,'archive');
const sameRoom=await page.evaluate(()=>{const a=window.qaAudio,voice=a.ambience;a.startMusic('ArchiveScene');return voice===a.ambience;});assert(sameRoom);
await page.evaluate(()=>window.qaAudio.startMusic('CherryBlossomGardenScene'));assert.equal((await debug()).ambienceProfile,'outdoors');
await page.evaluate(()=>window.qaAudio.setChannelVolume('effects',0));await page.waitForTimeout(300);
const mix=await page.evaluate(()=>({effects:window.qaAudio.effectsGain.gain.value,music:window.qaAudio.musicGain.gain.value}));assert(mix.effects<.001);assert(mix.music>.5);
await page.evaluate(()=>{window.qaAudio.setChannelVolume('effects',1);window.qaAudio.toggle();});assert.equal((await debug()).ambienceSources,0);assert.equal((await debug()).musicTimerActive,false);
await page.evaluate(()=>{window.qaAudio.startMusic('NaraStacksScene');window.qaAudio.toggle();});await page.waitForTimeout(400);assert.equal((await debug()).ambienceProfile,'archive');
await page.evaluate(()=>window.qaAudio.handleHidden());await page.waitForTimeout(100);assert.equal((await debug()).ambienceSources,0);assert.equal((await debug()).contextState,'suspended');
await page.evaluate(()=>window.qaAudio.handleVisible());await page.waitForTimeout(350);assert.equal((await debug()).ambienceProfile,'archive');assert.equal((await debug()).contextState,'running');
await page.evaluate(()=>window.qaAudio.startMusic('TitleScene'));assert.equal((await debug()).ambienceProfile,null);
assert.deepEqual(errors,[]);await writeFile(`${out}/result.json`,JSON.stringify({rendered,mix,sameRoom,errors,final:await debug()},null,2));console.log(JSON.stringify({rendered,mix,sameRoom,errors},null,2));
}finally{await browser.close();}
