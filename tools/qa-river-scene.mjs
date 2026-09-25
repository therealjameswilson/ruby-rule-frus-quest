import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium,webkit}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const out=process.env.FRUS_QA_OUT??'/tmp/river-scene';await mkdir(out,{recursive:true});
const base=process.env.FRUS_QA_URL??'http://127.0.0.1:5211/';const results=[];
for(const [name,engine] of [['chromium',chromium],['webkit',webkit]]){
 const b=await engine.launch(engine===chromium?{args:['--disable-audio-output']}:{});try{
 const p=await b.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true}),errors=[];p.on('pageerror',e=>errors.push(String(e)));
 await p.goto(new URL('?scene=ResearchWorldScene',base).href);await p.waitForFunction(()=>window.game?.scene.isActive('ResearchWorldScene'));await p.touchscreen.tap(5,5);
 await p.waitForFunction(()=>window.rubyRuleAudioDebug().musicTimerActive);
 if(name==='chromium')await p.waitForFunction(()=>window.rubyRuleAudioDebug().musicStep>1);
 const debug=()=>p.evaluate(()=>window.rubyRuleAudioDebug());const started=await debug();assert.equal(started.currentSceneKey,'ResearchWorldScene');assert.equal(started.currentThemeKey,'cherryGarden');
 await p.evaluate(()=>window.game.scene.getScene('ResearchWorldScene').player.setPosition(128,220));await p.waitForFunction(()=>window.rubyRuleAudioDebug().ambienceRiverPresence>.99);const near=await debug();
 // Natural movement must fade the river away without any direct audio calls.
 await p.keyboard.down('ArrowUp');try{await p.waitForFunction(()=>window.game.scene.getScene('ResearchWorldScene').player.position.y<167);}finally{await p.keyboard.up('ArrowUp');}const far=await debug();assert.equal(far.ambienceRiverPresence,0);
 await p.evaluate(()=>window.game.scene.getScene('ResearchWorldScene').travel(5,{x:128,y:220}));await p.waitForFunction(()=>window.game.scene.getScene('ResearchWorldScene').zone===5&&window.rubyRuleAudioDebug().ambienceRiverPresence>.99);
 await p.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});await p.waitForFunction(()=>window.rubyRuleAudioDebug().contextState==='suspended');assert.equal((await debug()).ambienceSources,0);
 await p.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});await p.locator('#tap-resume-overlay').click();await p.waitForFunction(()=>window.rubyRuleAudioDebug().ambienceRiverPresence>.99);const resumed=await debug();assert.equal(resumed.ambienceSources,4);
 await p.screenshot({path:`${out}/${name}-bridge.png`});
 // Return through the actual office interaction, and verify indoor room tone.
 await p.evaluate(()=>window.game.scene.getScene('ResearchWorldScene').travel(1,{x:24,y:168}));await p.waitForFunction(()=>window.game.scene.getScene('ResearchWorldScene').zone===1);await p.waitForTimeout(300);const button=p.locator('#portrait-touch-dock [data-control=space]');const r=await button.boundingBox();await p.touchscreen.tap(r.x+r.width/2,r.y+r.height/2);await p.waitForFunction(()=>window.game.scene.isActive('OfficeScene'));const indoors=await debug();assert.equal(indoors.ambienceRiverPresence,0);assert.equal(indoors.ambienceProfile,'office');assert.deepEqual(errors,[]);
 results.push({engine:name,started,near:near.ambienceRiverPresence,far:far.ambienceRiverPresence,regionRestart:true,resumed:resumed.ambienceRiverPresence,officeProfile:indoors.ambienceProfile,errors});
 }finally{await b.close();}
}
await writeFile(`${out}/result.json`,JSON.stringify({results,limitations:['Simulated phone; no physical iPhone or human listening','WebKit validated scene/lifecycle state only; its headless audio clock did not advance on this host','Position fixtures at bridge and office; real movement and office action','No manual audio scene selection']},null,2));console.log(JSON.stringify(results));
