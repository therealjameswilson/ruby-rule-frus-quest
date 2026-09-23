const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
import { mkdir,writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
assert(process.env.FRUS_QA_STORAGE, 'Provide a save earned by reaching Archive from Guide');
const out=process.env.FRUS_QA_OUT ?? '/private/tmp/frus-earned-source-note';await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE});
const context=await browser.newContext({storageState:process.env.FRUS_QA_STORAGE});
const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e)));
page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
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
 assert.equal((await state()).objective,'REVIEW SOURCE NOTE','Filed source trail must cue the remaining review, not a tool swing');
 await press();await shot('standards-decision');
 assert.equal((await state()).choice.options[0].value,'retain');
 assert(!(await state()).sceneProgress.archiveSourceNoteStamped);
 await press();await page.waitForTimeout(600);await shot('stamped');
 assert.equal((await state()).sceneProgress.archiveSourceNoteStamped,1);
 assert((await state()).volumeFragments.includes('Source Note Fragment'));
 await press();await page.waitForTimeout(450);
 assert.equal((await state()).latestMessage,'MENU: EQUIP CITATION STAMP');
 assert(!(await state()).sceneProgress.archiveRepoWallCleared);
 await shot('equip-guidance');
 // Equip the earned tool through the visible menu; owning it is not equipping it.
 await press('m');
 const tool=await page.evaluate(()=>JSON.parse(window.render_game_to_text()).pauseMenu.controls.find(c=>c.id==='tool-0'));
 const box=await page.locator('canvas').first().boundingBox();
 for(let i=0;i<2;i++){await page.mouse.click(box.x+tool.x*box.width/256,box.y+tool.y*box.height/240);await page.waitForTimeout(150);}
 assert.equal((await state()).pauseMenu.selectedTool,'citation_stamp');await press('Escape');
 await shot('stamp-equipped');
 const firstSwing=(await state()).playerCombat.weapon.swingId;
 let wallAttempts=0;
 for(;wallAttempts<3&&!(await state()).sceneProgress.archiveRepoWallCleared;wallAttempts++) {
   await press();await page.waitForTimeout(450);
 }
 await writeFile(`${out}/wall-clear.json`,JSON.stringify({attempts:wallAttempts,swings:(await state()).playerCombat.weapon.swingId-firstSwing},null,2));
 assert.equal((await state()).sceneProgress.archiveRepoWallCleared,1);
 await page.waitForFunction(()=>window.game.scene.getScene('UIScene').questBandCueText.text==='NORTH: ANNOTATION STACKS');
 await shot('route-open');await press();await page.waitForTimeout(700);
 await move(72,154);await move(72,76);await move(128,76);await press();
 await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).roomTraversal.currentRoomId==='AS');
 await page.waitForTimeout(1000);await shot('annotation-entry');
 await page.reload();
 await page.waitForFunction(()=>window.render_game_to_text&&JSON.parse(window.render_game_to_text()).scene==='TapToStartScene');
 await press('Enter');
 await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).scene==='ArchiveScene');
 await page.waitForTimeout(1000);
 assert.equal((await state()).roomTraversal.currentRoomId,'AS');
 const restoredY=(await state()).player.y;
 await press('ArrowUp');
 assert((await state()).player.y<restoredY,'restored room must accept movement');
 await shot('annotation-restored');
 assert.deepEqual(errors,[]);console.log('PASS earned source trail, standards decision, stamp, tool-cleared wall, Annotation Stacks entry and reload');
 await context.storageState({path:`${out}/earned-storage.json`});
}finally{await shot('last');await browser.close();}
