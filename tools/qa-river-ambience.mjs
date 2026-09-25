import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const base=process.env.FRUS_QA_URL??'http://127.0.0.1:5212/';const out=process.env.FRUS_QA_OUT??'/tmp/river-ambience';await mkdir(out,{recursive:true});
const browser=await chromium.launch({args:['--disable-audio-output']});
try{
const p=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const errors=[];p.on('pageerror',e=>errors.push(String(e)));
await p.goto(new URL('?scene=ResearchWorldScene',base).href);await p.waitForFunction(()=>window.game?.scene.isActive('ResearchWorldScene'));await p.mouse.click(5,5);
const rendered=await p.evaluate(async()=>{
 const {RoomAmbience}=await import('/src/systems/roomAmbience.ts');const reports=[];
 for(const y of [128,194,220]){
  const c=new OfflineAudioContext(2,22050*4,22050),room=new RoomAmbience(c,c.destination,'outdoors');room.setRiverPosition({y});
  const buffer=await c.startRendering();let peak=0,sum=0;for(let ch=0;ch<2;ch++)for(const v of buffer.getChannelData(ch).slice(22050)){peak=Math.max(peak,Math.abs(v));sum+=v*v;}
  reports.push({y,peak,rms:Math.sqrt(sum/(22050*3*2)),presence:room.riverPresence,sources:room.activeSourceCount});
 }
 const c=new OfflineAudioContext(2,22050*3,22050),room=new RoomAmbience(c,c.destination,'outdoors');room.setRiverPosition({y:220});
 const stopped=c.suspend(1).then(()=>{room.dispose();room.dispose();return c.resume();});const rendering=c.startRendering();await stopped;const audio=await rendering;
 return {reports,disposedSources:room.activeSourceCount,disposedPresence:room.riverPresence,tailPeak:Math.max(...audio.getChannelData(0).slice(22050*2).map(Math.abs))};
});
console.log(JSON.stringify(rendered));
assert(rendered.reports[2].rms>rendered.reports[0].rms*1.35);for(const r of rendered.reports){assert(r.peak<.03);assert.equal(r.sources,4);}assert.equal(rendered.disposedSources,0);assert.equal(rendered.tailPeak,0);
await p.evaluate(async()=>{const url=performance.getEntriesByType('resource').find(r=>new URL(r.name).pathname==='/src/systems/audio.ts')?.name;window.qaAudio=(await import(url??'/src/systems/audio.ts')).retroAudio;await window.qaAudio.unlock();window.game.scene.getScene('ResearchWorldScene').player.setPosition(128,220);});
await p.waitForFunction(()=>window.rubyRuleAudioDebug().ambienceRiverPresence>.99);
const near=await p.evaluate(()=>window.rubyRuleAudioDebug());assert.equal(near.currentSceneKey,'ResearchWorldScene');assert.equal(near.currentThemeKey,'cherryGarden');await p.screenshot({path:`${out}/bridge.png`});
// Use real directional input from a known position to walk back into the gardens.
await p.keyboard.down('ArrowUp');await p.waitForFunction(()=>window.game.scene.getScene('ResearchWorldScene').player.position.y<167);await p.keyboard.up('ArrowUp');await p.waitForTimeout(250);
const far=await p.evaluate(()=>window.rubyRuleAudioDebug());assert.equal(far.ambienceRiverPresence,0);
await p.evaluate(()=>{window.game.scene.getScene('ResearchWorldScene').player.setPosition(128,220);});await p.waitForFunction(()=>window.rubyRuleAudioDebug().ambienceRiverPresence>.99);
await p.evaluate(()=>window.qaAudio.setChannelVolume('effects',0));try{await p.waitForFunction(()=>window.qaAudio.effectsGain.gain.value<.001,{},{timeout:5000});}catch(e){console.log(await p.evaluate(()=>({debug:window.qaAudio.getDebugState(),gain:window.qaAudio.effectsGain.gain.value,time:window.qaAudio.context.currentTime,mix:window.qaAudio.getMix()})));throw e;}
await p.evaluate(()=>window.qaAudio.handleHidden());await p.waitForTimeout(150);assert.equal((await p.evaluate(()=>window.rubyRuleAudioDebug())).ambienceSources,0);
await p.evaluate(()=>window.qaAudio.handleVisible());await p.waitForFunction(()=>window.rubyRuleAudioDebug().ambienceRiverPresence>.99);assert.equal((await p.evaluate(()=>window.rubyRuleAudioDebug())).ambienceSources,4);
await p.evaluate(()=>window.qaAudio.startMusic('CherryBlossomGardenScene'));assert.equal((await p.evaluate(()=>window.rubyRuleAudioDebug())).ambienceRiverPresence,0);
assert.deepEqual(errors,[]);await writeFile(`${out}/result.json`,JSON.stringify({rendered,near,far,muted:true,hiddenCleanup:true,resumed:true,gardenReset:true,errors},null,2));console.log(JSON.stringify({rendered,near:near.ambienceRiverPresence,far:far.ambienceRiverPresence,errors}));
}finally{await browser.close();}
