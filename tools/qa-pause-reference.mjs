import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const out=process.env.FRUS_QA_OUT??'/tmp/frus-pause-reference';await mkdir(out,{recursive:true});
const browser=await chromium.launch();const results=[];
try{for(const [width,height] of [[375,667],[844,390]]){
 const page=await browser.newPage({viewport:{width,height},hasTouch:true});const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto(new URL('?scene=OfficeScene',process.env.FRUS_QA_URL??'http://127.0.0.1:5236/').href);
 await page.waitForFunction(()=>window.game?.scene.isActive('OfficeScene'));await page.waitForTimeout(400);
 const state=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));const before=await state();
 await page.evaluate(()=>window.game.scene.getScene('OfficeScene').inventory.toggle());
 const tap=async id=>{const hit=(await state()).pauseMenu.controls.find(c=>c.id===id);assert(hit);const box=await page.locator('canvas').first().boundingBox();await page.touchscreen.tap(box.x+hit.x*box.width/256,box.y+hit.y*box.height/240);await page.waitForTimeout(150);};
 const texts=()=>page.evaluate(()=>window.game.scene.getScene('OfficeScene').children.getByName('pause-menu').list.flatMap(c=>c.list??[]).filter(c=>c.name==='pause-text').map(c=>c.text).join(' '));
 await tap('record');await page.screenshot({path:`${out}/${width}-objective.png`});
 let reference=false;for(let i=0;i<10;i++){await tap('next');if((await texts()).includes('Background on how FRUS')){reference=true;break;}}
 assert(reference);assert((await texts()).includes('PROCESS REFERENCE'));await page.screenshot({path:`${out}/${width}-reference.png`});
 await tap('close');const after=await state();assert.deepEqual(after.sceneProgress,before.sceneProgress);assert.deepEqual(after.player,before.player);assert.deepEqual(errors,[]);
 results.push({width,height,reference,unchangedProgress:true,errors});await page.close();
}await writeFile(out+'/result.json',JSON.stringify(results,null,2));console.log('PASS pause process reference');}finally{await browser.close();}
