const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
import { mkdir,writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
assert(process.env.FRUS_QA_STORAGE, 'Provide a save earned by reaching Archive from Guide');
const out=process.env.FRUS_QA_OUT ?? '/private/tmp/frus-earned-source-note';await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE});
const mobile=process.argv.includes('--mobile');
const context=await browser.newContext({storageState:process.env.FRUS_QA_STORAGE,...(mobile?{viewport:{width:390,height:844},hasTouch:true,isMobile:true}:{})});
const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e)));
page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
const state=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
const shot=async name=>{await page.screenshot({path:`${out}/${name}.png`});await writeFile(`${out}/${name}.json`,JSON.stringify(await state(),null,2));};
const cdp=await context.newCDPSession(page);
if(mobile)for(const device of [page.keyboard,page.mouse])for(const method of ['press','down','up','click','move','type','insertText']){
 if(typeof device[method]==='function')device[method]=()=>{throw Error(`Non-touch input: ${method}`);};
}
const point=async(x,y)=>{const r=await page.locator('canvas').first().boundingBox();return{x:r.x+x*r.width/256,y:r.y+y*r.height/240};};
const tap=async(x,y)=>{const p=await point(x,y);await page.touchscreen.tap(p.x,p.y);};
const hold=async(key,ms)=>{
 if(!mobile){await page.keyboard.down(key);await page.waitForTimeout(ms);await page.keyboard.up(key);return;}
 const [dx,dy]={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[key];
 let p;
 if(await page.locator('#portrait-touch-dock').isVisible()){
  const r=await page.locator('.portrait-dpad').boundingBox();p={x:r.x+r.width*(.5+dx*.35),y:r.y+r.height*(.5+dy*.35)};
 }else p=await point(48+dx*26,202+dy*26);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...p,id:1}]});await page.waitForTimeout(ms);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
};
const press=async(key='Space')=>{
 if(!mobile)await page.keyboard.press(key,{delay:50});
 else if(key.startsWith('Arrow'))await hold(key,50);
 else if((await state()).scene==='TapToStartScene')await tap(86,154);
 else if(await page.locator('#portrait-touch-dock').isVisible())await page.locator('#portrait-touch-dock [data-control="space"]').tap();
 else await tap(225,205);
 await page.waitForTimeout(200);
};
async function move(x,y){for(let i=0;i<100;i++){const p=(await state()).player,dx=x-p.x,dy=y-p.y;if(Math.abs(dx)<4&&Math.abs(dy)<4)return;const horizontal=Math.abs(dx)>=4;const k=horizontal?dx>0?'ArrowRight':'ArrowLeft':dy>0?'ArrowDown':'ArrowUp';await hold(k,Math.min(100,Math.max(25,Math.abs(horizontal?dx:dy)/72*1000)));await page.waitForTimeout(30);}throw Error(`Cannot walk to ${x},${y}`);}
try{
 await page.goto(new URL('?text=full',process.env.FRUS_QA_URL??'http://127.0.0.1:5195/').href);
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
 const note=async key=>{const e=page.locator('.source-note-desk [data-focus-key='+key+']');await e.scrollIntoViewIfNeeded();if(mobile)await e.tap();else await e.click();await page.waitForTimeout(150);};
 await note('file');await shot('rejected');
 assert(!(await state()).sceneProgress.aboutSeriesFirstFootnoteComplete);
 await note('repair');await shot('corrected');
 await note('file');await shot('filed');assert.equal((await state()).sceneProgress.aboutSeriesFirstFootnoteComplete,1);
 assert.equal((await state()).objective,'REVIEW SOURCE NOTE','Filed source trail must cue the remaining review, not a tool swing');
 await press();await shot('standards-decision');
 assert.equal((await state()).choice.options[0].value,'retain');
 assert(!(await state()).sceneProgress.archiveSourceNoteStamped);
 await press();await page.waitForTimeout(600);await shot('stamped');
 assert.equal((await state()).sceneProgress.archiveSourceNoteStamped,1);
 assert((await state()).volumeFragments.includes('Source Note Fragment'));
 // Interact with the verified wall: ready the earned stamp and swing in one action.
 await press();await page.waitForTimeout(450);
 assert.equal((await state()).sceneProgress.archiveRepoWallCleared,1);
 assert(await page.evaluate(()=>window.game.scene.getScene('ArchiveScene').gateArt.get('north').some(o=>o.name==='snes-gate-detailed-frame'&&o.texture.key.includes('-open-'))), 'Earned north route must visibly open immediately');
 await shot('stamp-readied-wall-cleared');
 const firstSwing=(await state()).playerCombat.weapon.swingId;
 let wallAttempts=0;
 for(;wallAttempts<3&&!(await state()).sceneProgress.archiveRepoWallCleared;wallAttempts++) {
   await press();await page.waitForTimeout(450);
 }
 await writeFile(`${out}/wall-clear.json`,JSON.stringify({attempts:wallAttempts,swings:(await state()).playerCombat.weapon.swingId-firstSwing},null,2));
 assert.equal((await state()).sceneProgress.archiveRepoWallCleared,1);
 await page.waitForFunction(()=>window.game.scene.getScene('UIScene').questBandCueText.text==='NORTH: ANNOTATION STACKS');
 await shot('route-open');await press();await page.waitForTimeout(700);
 await move(72,154);await move(72,68);await move(128,68);
 await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).nearestInteractable==='ENTER NOTE STACKS');
 await shot('annotation-threshold');await press();
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
 await writeFile(`${out}/result.json`,JSON.stringify({mobile,earnedSourceTrail:true,correctedMistake:true,reviewed:true,gateOpened:true,annotationEntered:true,reloaded:true,errors},null,2));
 assert.deepEqual(errors,[]);console.log('PASS earned source trail, standards decision, stamp, tool-cleared wall, Annotation Stacks entry and reload');
 await context.storageState({path:`${out}/earned-storage.json`});
}finally{await shot('last');await browser.close();}
