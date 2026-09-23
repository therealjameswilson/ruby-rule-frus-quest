import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const base=process.env.FRUS_QA_URL??'http://127.0.0.1:5202/';
const out=process.env.FRUS_QA_OUT??'/tmp/danne-disguises-qa';await mkdir(out,{recursive:true});
const browser=await chromium.launch(),results=[];
try{for(const phone of [false,true]){
 const context=await browser.newContext({viewport:phone?{width:375,height:667}:{width:768,height:720},deviceScaleFactor:phone?2:1,isMobile:phone,hasTouch:phone});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(new URL('?scene=ResearchWorldScene',base).href);
 await page.waitForFunction(()=>window.game?.scene.getScene('ResearchWorldScene')?.player);
 await page.waitForTimeout(300);
 await page.evaluate(()=>window.game.scene.getScene('ResearchWorldScene').player.setPosition(130,163));
 const movies=[];
 for(let i=0;i<20;i++){
  await page.waitForFunction(i=>window.game.scene.getScene('ResearchWorldScene').disguise===i,i);
  const state=await page.evaluate(()=>{const s=window.game.scene.getScene('ResearchWorldScene');return {movie:JSON.parse(window.render_game_to_text()).researchWorld.danneDisguise,height:s.danne.displayHeight,y:s.danne.y,key:s.danne.texture.key};});
  assert(Math.abs(state.height-42)<0.001);assert.equal(state.y,143);assert.equal(state.key,`danne-disguise-${i}`);movies.push(state.movie);
  await page.screenshot({path:`${out}/${phone?'phone':'desktop'}-${i+1}.png`});
  if(phone){const b=await page.locator('canvas').first().boundingBox();await page.touchscreen.tap(b.x+173*b.width/256,b.y+216*b.height/240);}else await page.keyboard.press('x');
 }
 await page.waitForFunction(()=>window.game.scene.getScene('ResearchWorldScene').disguise===0);
 assert.equal(new Set(movies).size,20);
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('rubyRuleFrusQuestSave')).state.sceneProgress.researchDanneDisguise),0);
 await page.keyboard.press('Space');await page.waitForTimeout(150);
 assert((await page.evaluate(()=>JSON.parse(window.render_game_to_text()).dialog.text)).includes('Argo'));
 await page.evaluate(()=>window.game.scene.getScene('ResearchWorldScene').dialog.hide());
 await page.evaluate(()=>window.game.scene.getScene('ResearchWorldScene').travel(0));await page.waitForTimeout(300);
 await page.waitForFunction(()=>window.game.scene.getScene('ResearchWorldScene').disguise===1);
 assert.deepEqual(errors,[]);results.push({phone,movies,passed:['20 live textures','B input and wrap','grounded 42px height','saved selection','named dialogue','travel advances disguise'],errors});await context.close();
}await writeFile(`${out}/results.json`,JSON.stringify(results,null,2));console.log(JSON.stringify(results));}finally{await browser.close();}
