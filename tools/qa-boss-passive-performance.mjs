import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const base=process.env.FRUS_QA_URL??'http://127.0.0.1:5211/';
const out=process.env.FRUS_QA_OUT??'/tmp/boss-passive-performance';
const template=JSON.parse(await readFile(process.env.FRUS_QA_STORAGE,'utf8'));
await mkdir(out,{recursive:true});
const browser=await chromium.launch();const results=[];
try {
 for(const phase of ['colossus','swarm','cloud'])for(const debugReads of [false,true,"protocol"]){
  const storage=structuredClone(template),entry=storage.origins.flatMap(o=>o.localStorage).find(v=>v.name==='rubyRuleFrusQuestSave');
  const save=JSON.parse(entry.value);Object.assign(save.state.sceneProgress,{blackVaultBossPhase:['colossus','swarm','cloud'].indexOf(phase)+1,blackVaultBossHp:180});entry.value=JSON.stringify(save);
  const context=await browser.newContext({storageState:storage,viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true});
  const page=await context.newPage(),cdp=await context.newCDPSession(page),errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
  await page.goto(`${base}?text=full`);await page.waitForFunction(()=>window.game?.scene.isActive('TapToStartScene'));await page.keyboard.press('Enter');
  await page.waitForFunction(()=>window.game?.scene.isActive('BlackVaultLairScene'));await page.waitForTimeout(1500);
  await page.evaluate(()=>window.game.scene.getScene('BlackVaultLairScene').player.setPosition(128,144));await page.keyboard.press('Space');
  await page.waitForFunction(()=>window.game.scene.getScene('BlackVaultLairScene').danneBoss?.phaseDialogueActive);
  await page.waitForTimeout(1400);await page.keyboard.press('Space');
  await page.waitForFunction(()=>{const b=window.game.scene.getScene('BlackVaultLairScene').danneBoss;return !b.phaseDialogueActive&&!b.phaseTransitioning;});
  await page.evaluate(()=>window.game.scene.getScene('BlackVaultLairScene').player.setPosition(128,195));await page.waitForTimeout(500);
  const measurement=page.evaluate(async({phase,debugReads})=>{
   const scene=window.game.scene.getScene('BlackVaultLairScene'),boss=scene.danneBoss;
   const samples=[],readCosts=[];let previous=performance.now(),excluded=0,recolors=0;
   const status=boss.clockStatusText,recolor=status.setColor;
   status.setColor=function(...args){recolors++;return recolor.apply(this,args);};
   const collect=()=>{const now=performance.now(),delta=now-previous;previous=now;if(boss.currentPhase===phase&&!boss.phaseDialogueActive&&!boss.inputLocked&&!boss.phaseTransitioning&&boss.combatPausedAt===null)samples.push(delta);else excluded++;};
   window.game.events.on('step',collect);
   const timer=debugReads===true?setInterval(()=>{const start=performance.now();JSON.parse(window.render_game_to_text());readCosts.push(performance.now()-start);},200):null;
   await new Promise(r=>setTimeout(r,8000));
   if(timer!==null)clearInterval(timer);window.game.events.off('step',collect);status.setColor=recolor;
   const gl=window.game.renderer.gl,ext=gl.getExtension('WEBGL_debug_renderer_info');
   return {phase,debugReads,samples,readCosts,excluded,recolors,renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):'unknown'};
  },{phase,debugReads});
  let measuring=true,protocolReads=0;
  measurement.finally(()=>{measuring=false;}).catch(()=>{});
  if(debugReads==='protocol')while(measuring){await page.evaluate(()=>JSON.parse(window.render_game_to_text()));protocolReads++;await page.waitForTimeout(200);}
  const result=await measurement;result.protocolReads=protocolReads;
  const sorted=[...result.samples].sort((a,b)=>a-b);assert(sorted.length>250,'Need enough active combat samples');
  result.summary={frames:sorted.length,p99Ms:sorted[Math.floor(sorted.length*.99)],maxMs:sorted.at(-1),over33Ms:sorted.filter(t=>t>33.4).length};
  result.errors=errors;assert.deepEqual(errors,[]);assert(result.recolors<=1,'Stable clock status must not recolor each frame');results.push(result);console.log(JSON.stringify({phase,debugReads,...result.summary,excluded:result.excluded}));
  if(!debugReads)await page.screenshot({path:`${out}/${phase}.png`});await context.close();
 }
} finally {
 await writeFile(`${out}/results.json`,JSON.stringify({scope:'Saved phase and position fixtures; stationary hero, active boss. Eight seconds per sample with no protocol polling or screenshots. Local debug variant parses full state every 200ms; protocol variant additionally transfers the resulting object to Playwright, then waits 200ms. Software renderer and 4x CPU slowdown; not physical-device performance or a victory playtest.',results},null,2));await browser.close();
}
