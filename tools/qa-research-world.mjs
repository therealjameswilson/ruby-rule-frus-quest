import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const base=process.env.FRUS_QA_URL??'http://127.0.0.1:5202/';
const out=process.env.FRUS_QA_OUT??'/tmp/research-world-qa';await mkdir(out,{recursive:true});
const browser=await chromium.launch(),results=[];
try{
for(const phone of [false,true]){
 const context=await browser.newContext({viewport:phone?{width:375,height:667}:{width:1024,height:960},deviceScaleFactor:phone?2:1,isMobile:phone,hasTouch:phone});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 const state=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
 const act=async()=>{if(phone){const b=await page.locator('canvas').first().boundingBox();await page.touchscreen.tap(b.x+223*b.width/256,b.y+206*b.height/240);}else await page.keyboard.press('Space');await page.waitForTimeout(180);};
 const pos=async(x,y)=>{await page.evaluate(({x,y})=>window.game.scene.getScenes(true).find(s=>s.player)?.player.setPosition(x,y),{x,y});await page.waitForTimeout(60);};
 const close=async()=>{await page.evaluate(()=>window.game.scene.getScene('ResearchWorldScene').dialog.hide());await page.waitForTimeout(100);};
 await page.goto(new URL('?scene=OfficeScene',base).href);
 await page.waitForFunction(()=>window.game?.scene.getScene('OfficeScene')?.player);
 await page.waitForTimeout(500);await pos(43,190);await act();
 await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).scene==='ResearchWorldScene');
 await page.waitForTimeout(450);assert((await state()).visibleEntities.includes('POTOMAC GREEN'));
 await page.screenshot({path:`${out}/${phone?'phone':'desktop'}-potomac.png`});
 // Actual boundary input moves between the contiguous DC-area screens.
 await pos(247,135);await page.keyboard.down('ArrowRight');await page.waitForTimeout(100);await page.keyboard.up('ArrowRight');
 await page.waitForTimeout(150);assert((await state()).visibleEntities.includes('CAPITAL COMMONS'));
 await pos(128,61);await page.keyboard.down('ArrowUp');await page.waitForTimeout(100);await page.keyboard.up('ArrowUp');
 await page.waitForTimeout(150);assert((await state()).visibleEntities.includes('MARYLAND GROVE'));
 await pos(128,229);await page.keyboard.down('ArrowDown');await page.waitForTimeout(100);await page.keyboard.up('ArrowDown');
 await page.waitForTimeout(150);assert((await state()).visibleEntities.includes('CAPITAL COMMONS'));
 // DANN-E is approachable and harmless in the outdoor world.
 await pos(130,157);await act();assert.equal((await state()).dialog.speaker,'DANN-E');await close();
 assert.deepEqual((await state()).visibleThreats,[]);
 // Real rail menu choice, including cancel, then touch or keyboard selection.
 await pos(128,206);await act();assert((await state()).choice);
 await page.waitForTimeout(250);if(phone){const b=await page.locator('canvas').first().boundingBox();await page.touchscreen.tap(b.x+232*b.width/256,b.y+22*b.height/240);}else await page.keyboard.press('Escape');await page.waitForTimeout(150);assert.equal((await state()).choice,null);
 await act();await page.waitForTimeout(250);
 if(phone){const row=await page.evaluate(()=>{const r=window.game.scene.getScene('ResearchWorldScene').choice.rows[0];return{x:r.x,y:r.y};});const b=await page.locator('canvas').first().boundingBox();await page.touchscreen.tap(b.x+row.x*b.width/256,b.y+row.y*b.height/240);}else await page.keyboard.press('Enter');
 await page.waitForTimeout(300);assert((await state()).visibleEntities.includes('EASTERN LIBRARIES'));
 // Bounded fixtures position the player at every entrance, then use real A input.
 for(const zone of [0,1,2,3,4,5,6]){
  await page.evaluate(zone=>window.game.scene.getScene('ResearchWorldScene').travel(zone),zone);await page.waitForTimeout(160);
  const count=[2,1,1,3,4,2,3][zone];
  for(let i=0;i<count;i++){
   const stop=await page.evaluate(i=>{const s=window.game.scene.getScene('ResearchWorldScene').stops[i];return {x:s.x,y:s.y,label:s.label};},i);
   await pos(stop.x,stop.y);await act();assert((await state()).dialog,`Missing discovery dialog ${stop.label}`);await close();
  }
  await pos(128,188);await page.waitForTimeout(300);await page.screenshot({path:`${out}/${phone?'phone':'desktop'}-zone-${zone}.png`});
 }
 assert.equal(await page.evaluate(()=>window.game.scene.getScene('ResearchWorldScene').tally.text),'DISCOVERIES 16/16');
 assert.deepEqual((await state()).processStamps,[]);
 assert.equal(Object.entries(await page.evaluate(()=>JSON.parse(localStorage.getItem('rubyRuleFrusQuestSave')).state.sceneProgress)).filter(([key,value])=>key.startsWith('researchVisited_')&&value===1).length,16);
 // Pause, resume, and the DC / office return route preserve discovery progress.
 await page.keyboard.press('Escape');await page.waitForTimeout(150);assert((await state()).pauseMenu);await page.keyboard.press('Escape');await page.waitForTimeout(150);assert.equal((await state()).pauseMenu,null);
 await pos(24,168);await act();await page.waitForTimeout(180);assert((await state()).visibleEntities.includes('CAPITAL COMMONS'));
 await pos(24,168);await act();await page.waitForTimeout(500);assert.equal((await state()).scene,'OfficeScene');
 await pos(43,190);await act();await page.waitForTimeout(500);assert.equal((await state()).scene,'ResearchWorldScene');
 assert.equal(await page.evaluate(()=>window.game.scene.getScene('ResearchWorldScene').tally.text),'DISCOVERIES 16/16');
 assert.deepEqual(errors,[]);results.push({phone,discoveries:16,errors,passed:['office exit before tutorial','DC edges both ways','DANN-E civilian dialog','rail cancel and travel','16 landmark A interactions','no production stamps','pause/resume','return to office and back']});
 await context.close();
}
await writeFile(`${out}/results.json`,JSON.stringify(results,null,2));console.log(JSON.stringify(results));
}finally{await browser.close();}
