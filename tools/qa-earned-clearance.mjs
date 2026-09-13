const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
assert(process.env.FRUS_QA_STORAGE, 'Provide the preceding earned checkpoint via FRUS_QA_STORAGE');
const out=process.env.FRUS_QA_OUT ?? '/private/tmp/frus-earned-clearance';await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE});
const context=await browser.newContext({storageState:process.env.FRUS_QA_STORAGE});
const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e)));
page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
const state=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
const key=async(k='Space',ms=50)=>{await page.keyboard.down(k);await page.waitForTimeout(ms);await page.keyboard.up(k);await page.waitForTimeout(150);};
const shot=async name=>{const data=await page.evaluate(()=>new Promise(r=>window.game.renderer.snapshot(i=>r(i.src))));await writeFile(`${out}/${name}.png`,Buffer.from(data.split(',')[1],'base64'));await writeFile(`${out}/${name}.json`,JSON.stringify(await state(),null,2));};
async function move(x,y){for(let i=0;i<100;i++){const p=(await state()).player,dx=x-p.x,dy=y-p.y;if(Math.abs(dx)<3&&Math.abs(dy)<3)return;const h=Math.abs(dx)>=3;await key(h?dx>0?'ArrowRight':'ArrowLeft':dy>0?'ArrowDown':'ArrowUp',Math.min(100,Math.max(20,Math.abs(h?dx:dy)/72*1000)));}throw Error(`Cannot walk to ${x},${y}`);}
try{
 await page.goto('http://127.0.0.1:5195/?text=full');
 await page.waitForFunction(()=>window.render_game_to_text&&JSON.parse(window.render_game_to_text()).scene==='TapToStartScene');await key('Enter');
 await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).scene==='NetworkScene');await page.waitForTimeout(1000);



 assert.equal((await state()).roomTraversal.currentRoomId,'N2');await shot('arrival');
 await move(96,132);await key();assert.equal((await state()).sceneProgress.classNetVaultDocketCarried,1);
 await move(80,150);await key();await shot('human-filed');assert.equal((await state()).sceneProgress.classNetVaultReviewStep,1);
 await move(96,96);await key();await shot('release-filed');assert.equal((await state()).sceneProgress.classNetVaultReviewStep,2);
 await move(164,96);await move(176,150);await key();await shot('ledger');
 console.log(JSON.stringify((await state()).choice));
 await key('ArrowDown');await key();await shot('missing-entry');
 assert(!(await state()).sceneProgress.classNetVaultReviewComplete);
 await key('ArrowRight');await key('ArrowRight');await shot('chronology-corrected');
 await key('ArrowDown');await key();await page.waitForTimeout(600);await shot('review-complete');
 assert.equal((await state()).sceneProgress.classNetVaultReviewComplete,1);
 await move(164,132);await key();await shot('token');
 assert((await state()).inventory.includes('Clearance Token'));
 await move(216,132);await move(216,120);await key('ArrowRight',1200);
 await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).scene==='ReferralVaultScene');
 await page.waitForTimeout(700);await shot('referral-arrival');

 const arrived=await state();
 assert.equal(arrived.roomTraversal.currentRoomId,'R1');
 await page.reload();
 await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).scene==='TapToStartScene');await key('Enter');
 await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).scene==='ReferralVaultScene');
 await page.waitForTimeout(500);
 const restored=await state();
 assert.equal(restored.roomTraversal.currentRoomId,'R1');
 assert.equal(restored.sceneProgress.classNetVaultReviewComplete,1);
 assert(restored.inventory.includes('Clearance Token'));
 assert.equal(restored.documentPoints,arrived.documentPoints,'Reload must not award the review again');
 await shot('referral-restored');
 await key('ArrowDown',150);
 assert((await state()).player.y>restored.player.y,'Movement must resume after the handoff reload');

 await context.storageState({path:`${out}/earned-storage.json`});
 assert.deepEqual(errors,[]);console.log('PASS earned review batch, missing-entry rejection, chronology repair, Clearance Token, referral arrival and reload');
}finally{await shot('last');await browser.close();}
