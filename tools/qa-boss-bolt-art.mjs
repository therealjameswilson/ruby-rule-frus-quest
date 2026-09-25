import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const base=process.env.FRUS_QA_URL??'http://127.0.0.1:5211/',out=process.env.FRUS_QA_OUT??'/tmp/boss-bolt-art';
await mkdir(out,{recursive:true});
const template=JSON.parse(await readFile(process.env.FRUS_QA_STORAGE,'utf8'));
const browser=await chromium.launch(),results=[];
try{
 for(const mode of ['desktop','phone','reduced'].filter(m=>!process.env.FRUS_QA_MODE||process.env.FRUS_QA_MODE===m)){
  const mobile=mode!=='desktop',storage=structuredClone(template),entry=storage.origins.flatMap(o=>o.localStorage).find(v=>v.name==='rubyRuleFrusQuestSave');
  const save=JSON.parse(entry.value);Object.assign(save.state.sceneProgress,{blackVaultBossPhase:1,blackVaultBossHp:180});entry.value=JSON.stringify(save);
  const page=await browser.newPage({storageState:storage,viewport:mobile?{width:390,height:844}:{width:1024,height:960},deviceScaleFactor:mobile?3:1,isMobile:mobile,hasTouch:mobile,reducedMotion:mode==='reduced'?'reduce':'no-preference'});
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(`${base}?text=full`);await page.waitForFunction(()=>window.game?.scene.isActive('TapToStartScene'));await page.keyboard.press('Enter');
  await page.waitForFunction(()=>window.game?.scene.isActive('BlackVaultLairScene'));await page.waitForTimeout(1500);
  await page.evaluate(()=>window.game.scene.getScene('BlackVaultLairScene').player.setPosition(128,144));await page.keyboard.press('Space');
  await page.waitForFunction(()=>window.game.scene.getScene('BlackVaultLairScene').danneBoss?.phaseDialogueActive);await page.waitForTimeout(1400);await page.keyboard.press('Space');
  await page.waitForFunction(()=>{const b=window.game.scene.getScene('BlackVaultLairScene').danneBoss;return !b.phaseDialogueActive&&!b.phaseTransitioning;});
  await page.evaluate(()=>{const scene=window.game.scene.getScene('BlackVaultLairScene');scene.player.setPosition(128,192);scene.danneBoss.clearBolts();scene.danneBoss.nextBoltAt=scene.time.now+30000;});
  const incoming=await page.evaluate(()=>new Promise(resolve=>{
    const scene=window.game.scene.getScene('BlackVaultLairScene'),boss=scene.danneBoss;
    boss.fireBolt({x:88,y:171},{x:130,y:192},60);
    window.game.renderer.snapshot(image=>{
      const bolt=boss.bolts[0],tail=scene.children.getByName('boss-ego-direction-tail');
      resolve({angle:tail.angle,expectedAngle:Math.atan2(bolt.vy,bolt.vx)*180/Math.PI,visible:tail.visible,depth:tail.depth,spriteDepth:bolt.sprite.depth,image:image.src});
    });
  }));
  assert.equal(incoming.visible,mode!=='reduced');assert(Math.abs(incoming.angle-incoming.expectedAngle)<0.001);assert(incoming.depth<incoming.spriteDepth);
  await writeFile(`${out}/${mode}-incoming.png`,Buffer.from(incoming.image.split(',')[1],'base64'));delete incoming.image;
  await page.evaluate(()=>window.game.scene.getScene('BlackVaultLairScene').danneBoss.clearBolts());
  await page.keyboard.press('x');await page.waitForFunction(()=>window.game.scene.getScene('BlackVaultLairScene').player.combatReadout.weapon.phase==='active');
  const returned=await page.evaluate(()=>new Promise(resolve=>{
    const scene=window.game.scene.getScene('BlackVaultLairScene'),boss=scene.danneBoss,box=scene.player.activeActionHitbox;
    boss.fireBolt({x:box.centerX,y:box.centerY+10},{x:128,y:192},60);boss.updateBolts(scene.time.now,0);
    window.game.renderer.snapshot(image=>{
      const bolt=boss.bolts[0],tail=scene.children.getByName('boss-ego-direction-tail');
      resolve({returned:bolt.returned,tintFill:bolt.sprite.tintFill,visible:tail.visible,color:tail.fillColor,image:image.src});
    });
  }));
  assert(returned.returned);assert.equal(returned.tintFill,false);assert.equal(returned.visible,mode!=='reduced');assert.equal(returned.color,0x66d8df);
  await writeFile(`${out}/${mode}-returned.png`,Buffer.from(returned.image.split(',')[1],'base64'));delete returned.image;
  const cleanup=await page.evaluate(()=>{
    const scene=window.game.scene.getScene('BlackVaultLairScene'),boss=scene.danneBoss;
    const count=()=>scene.children.list.filter(o=>o.name==='boss-ego-direction-tail').length;
    boss.clearBolts();const clear=count();boss.fireBolt({x:40,y:100},{x:50,y:100},60);boss.updateBolts(scene.time.now+3000,0);const expiry=count();
    boss.fireBolt({x:300,y:100},{x:310,y:100},60);boss.updateBolts(scene.time.now,0);return{clear,expiry,outside:count()};
  });
  assert.deepEqual(cleanup,{clear:0,expiry:0,outside:0});assert.deepEqual(errors,[]);results.push({mode,incoming,returned,cleanup,errors});await page.close();
 }
}finally{await writeFile(`${out}/results.json`,JSON.stringify({scope:'Saved phase and position fixtures; keyboard swing returns a bolt spawned within its live hitbox. Tests direction, texture preservation, reduced motion, and disposal; not a natural playthrough.',results},null,2));await browser.close();}
