const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
import { mkdir,writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
assert(process.env.FRUS_QA_STORAGE, 'Provide a save earned by reaching Archive from Guide');
const out=process.env.FRUS_QA_OUT ?? '/private/tmp/frus-earned-source-note';await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE});
const context=await browser.newContext({storageState:process.env.FRUS_QA_STORAGE});
const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e)));
const state=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
const shot=async name=>{const data=await page.evaluate(()=>new Promise(r=>window.game.renderer.snapshot(i=>r(i.src))));await writeFile(`${out}/${name}.png`,Buffer.from(data.split(',')[1],'base64'));await writeFile(`${out}/${name}.json`,JSON.stringify(await state(),null,2));};
const press=async key=>{await page.keyboard.press(key||'Space',{delay:50});await page.waitForTimeout(200);};
async function move(x,y){for(let i=0;i<100;i++){const p=(await state()).player,dx=x-p.x,dy=y-p.y;if(Math.abs(dx)<4&&Math.abs(dy)<4)return;const horizontal=Math.abs(dx)>=4;const k=horizontal?dx>0?'ArrowRight':'ArrowLeft':dy>0?'ArrowDown':'ArrowUp';await page.keyboard.down(k);await page.waitForTimeout(Math.min(100,Math.max(25,Math.abs(horizontal?dx:dy)/72*1000)));await page.keyboard.up(k);await page.waitForTimeout(30);}throw Error(`Cannot walk to ${x},${y}`);}
try{
 await page.goto('http://127.0.0.1:5195/?text=full');
 await page.waitForFunction(()=>window.render_game_to_text&&JSON.parse(window.render_game_to_text()).scene==='TapToStartScene');await press('Enter');
 await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).scene==='ArchiveScene');await page.waitForTimeout(1800);
 assert((await state()).inventory.includes('Citation Stamp'));await shot('arrival');
 await press();assert.equal((await state()).heldItem,'Source Note 47');
 await move(128,154);await press();assert.equal((await state()).sceneProgress.archiveSourceNoteRouted,1);await shot('routed');
 await move(72,154);await press();await shot('collection');
 await move(72,96);await press();await shot('repository');
 await move(72,154);await move(184,154);await press();await shot('folder');
 assert.equal((await state()).sceneProgress.sourceNoteProvenanceMask,7);
 await move(128,154);await press();await shot('board');assert.equal((await state()).mode,'choice');
 await press('ArrowDown');await press();await shot('rejected');
 assert(!(await state()).sceneProgress.aboutSeriesFirstFootnoteComplete);
 await press('ArrowUp');await press();await shot('corrected');
 await press();await shot('filed');assert.equal((await state()).sceneProgress.aboutSeriesFirstFootnoteComplete,1);
 await press();await shot('stamped');
 assert.deepEqual(errors,[]);console.log('PASS earned source trail and repaired readership claim');
 await context.storageState({path:`${out}/earned-storage.json`});
}finally{await shot('last');await browser.close();}
