import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const base=process.env.FRUS_QA_URL??'http://127.0.0.1:5211/',out=process.env.FRUS_QA_OUT??'/tmp/boss-damage-trail';
await mkdir(out,{recursive:true});
const template=JSON.parse(await readFile(process.env.FRUS_QA_STORAGE,'utf8'));
const browser=await chromium.launch(),results=[];
try{
 for(const mode of ['desktop','phone','reduced','contrast'].filter(m=>!process.env.FRUS_QA_MODE||process.env.FRUS_QA_MODE===m)){
  const mobile=mode!=='desktop',storage=structuredClone(template),entry=storage.origins.flatMap(o=>o.localStorage).find(v=>v.name==='rubyRuleFrusQuestSave');
  const save=JSON.parse(entry.value);Object.assign(save.state.sceneProgress,{blackVaultBossPhase:1,blackVaultBossHp:180});entry.value=JSON.stringify(save);
  const page=await browser.newPage({storageState:storage,viewport:mobile?{width:390,height:844}:{width:1024,height:960},deviceScaleFactor:mobile?3:1,isMobile:mobile,hasTouch:mobile,reducedMotion:mode==='reduced'?'reduce':'no-preference'});
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  if(mode==='contrast')await page.addInitScript(()=>localStorage.setItem('ruby-rule.highContrastColorblind','true'));
  await page.goto(`${base}?text=full`);await page.waitForFunction(()=>window.game?.scene.isActive('TapToStartScene'));await page.keyboard.press('Enter');
  await page.waitForFunction(()=>window.game?.scene.isActive('BlackVaultLairScene'));await page.waitForTimeout(1500);
  await page.evaluate(()=>window.game.scene.getScene('BlackVaultLairScene').player.setPosition(128,144));await page.keyboard.press('Space');
  await page.waitForFunction(()=>window.game.scene.getScene('BlackVaultLairScene').danneBoss?.phaseDialogueActive);await page.waitForTimeout(1400);await page.keyboard.press('Space');
  await page.waitForFunction(()=>{const b=window.game.scene.getScene('BlackVaultLairScene').danneBoss;return !b.phaseDialogueActive&&!b.phaseTransitioning;});
  const hit=await page.evaluate(()=>new Promise(resolve=>{
   const scene=window.game.scene.getScene('BlackVaultLairScene'),boss=scene.danneBoss;
   const hp=boss.hp;boss.takeReturnedBolt(scene.time.now);
   const trail=scene.children.getByName('boss-health-hud').list.find(o=>o.name==='boss-damage-trail');
   window.qaTrailRead=()=>({width:trail.width,visible:trail.visible,hp:boss.hp,color:trail.fillColor});
   window.game.renderer.snapshot(image=>resolve({beforeHp:hp,...window.qaTrailRead(),image:image.src}));
  }));
  assert(hit.hp<hit.beforeHp);assert.equal(hit.visible,mode!=='reduced');if(mode==='contrast')assert.equal(hit.color,0xE8D8A8);
  await writeFile(`${out}/${mode}-hit.png`,Buffer.from(hit.image.split(',')[1],'base64'));delete hit.image;
  if(mode!=='reduced'){
   await page.keyboard.press('m');await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).mode==='pause');
   const paused=await page.evaluate(()=>window.qaTrailRead());assert(paused.visible);
   await page.waitForTimeout(500);assert.deepEqual(await page.evaluate(()=>window.qaTrailRead()),paused);
   await page.keyboard.press('Escape');await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).mode==='explore');await page.waitForTimeout(650);
  }
  assert.equal((await page.evaluate(()=>window.qaTrailRead())).visible,false);
  await page.evaluate(()=>{const scene=window.game.scene.getScene('BlackVaultLairScene');scene.danneBoss.beginPhase('swarm');});
  assert.equal((await page.evaluate(()=>window.qaTrailRead())).visible,false,'New phase must clear old damage');
  await page.screenshot({path:`${out}/${mode}-settled.png`});assert.deepEqual(errors,[]);results.push({mode,hit,paused:mode!=='reduced',phaseReset:true,errors});await page.close();
 }
}finally{await writeFile(`${out}/results.json`,JSON.stringify({scope:'Saved checkpoint and position fixtures; damage invokes real returned-bolt handler. Pause/resume uses keyboard. Not a natural fight playthrough.',results},null,2));await browser.close();}
