const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
assert(process.env.FRUS_QA_STORAGE, 'Provide an earned Archive checkpoint via FRUS_QA_STORAGE');
const out=process.env.FRUS_QA_OUT ?? '/tmp/frus-lurker-recovery'; await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE});
const context=await browser.newContext({storageState:process.env.FRUS_QA_STORAGE});
const page=await context.newPage(); const errors=[]; page.on('pageerror',e=>errors.push(String(e)));
const state=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
const key=async k=>{await page.keyboard.press(k,{delay:20});};
const shot=async name=>{const s=await state();await writeFile(`${out}/${name}.json`,JSON.stringify(s,null,2));const src=await page.evaluate(()=>new Promise(r=>window.game.renderer.snapshot(i=>r(i.src))));await writeFile(`${out}/${name}.png`,Buffer.from(src.split(',')[1],'base64'));};
try{
 await page.goto(new URL('?text=full', process.env.FRUS_QA_URL ?? 'http://127.0.0.1:5195/').href);
 await page.waitForFunction(()=>window.render_game_to_text&&JSON.parse(window.render_game_to_text()).scene==='TapToStartScene');await key('Enter');
 await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).scene==='ArchiveScene');
 const initial=await state(); const deadline=Date.now()+100000;
 let damaged=false, recovered=false, previous=initial;
 while(Date.now()<deadline){
  const s=await state();assert.equal(s.scene,'ArchiveScene');
  const debt=s.sceneProgress.danneRecoverablePressure??0;
  if(!damaged&&debt>0){damaged=true;await shot('damaged');console.log('damage',s.reliability,debt);}
  if(damaged&&s.reliability>previous.reliability&&(s.sceneProgress.danneRecoverablePressure??0)<(previous.sceneProgress.danneRecoverablePressure??0)){
   assert(s.reliability-previous.reliability<=2);recovered=true;await shot('returned');
   assert.deepEqual(s.inventory,initial.inventory);assert.equal(s.documentPoints,initial.documentPoints);
   await writeFile(`${out}/recovery.json`,JSON.stringify({before:previous.reliability,after:s.reliability,debtBefore:previous.sceneProgress.danneRecoverablePressure,debtAfter:debt},null,2));break;
  }
  if(damaged){
   const threat=s.visibleThreats.find(t=>t.label==='DANN-E LURKER');
   const bolt=threat?.counterplay.bolts.find(b=>!b.returned);
   if(bolt){const dx=bolt.x-s.player.x,dy=bolt.y-s.player.y;
    const facing=Math.abs(dx)>Math.abs(dy)?dx>0?'east':'west':dy>0?'south':'north';
    if(s.playerFacing!==facing)await key({east:'ArrowRight',west:'ArrowLeft',south:'ArrowDown',north:'ArrowUp'}[facing]);
    if(Math.max(Math.abs(dx),Math.abs(dy))<39&&Math.min(Math.abs(dx),Math.abs(dy))<12&&s.playerCombat.weapon.canSwing)await key('x');
   }
  }
  previous=s;await page.waitForTimeout(25);
 }
 assert(damaged,'No actual hit observed');assert(recovered,'No returned-bolt recovery observed');
 assert.deepEqual(errors,[]);console.log('PASS earned Archive hit and returned-bolt recovery');
}catch(e){await shot('failure');console.error(e);process.exitCode=1;}finally{await browser.close();}
