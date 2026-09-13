const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
assert(process.env.FRUS_QA_STORAGE, 'Provide the preceding earned checkpoint via FRUS_QA_STORAGE');
const out=process.env.FRUS_QA_OUT ?? '/private/tmp/frus-earned-referral';await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE});
const context=await browser.newContext({storageState:process.env.FRUS_QA_STORAGE});
const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e)));
const state=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
const key=async(k='Space',ms=50)=>{await page.keyboard.down(k);await page.waitForTimeout(ms);await page.keyboard.up(k);await page.waitForTimeout(150);};
const shot=async name=>{const data=await page.evaluate(()=>new Promise(r=>window.game.renderer.snapshot(i=>r(i.src))));await writeFile(`${out}/${name}.png`,Buffer.from(data.split(',')[1],'base64'));await writeFile(`${out}/${name}.json`,JSON.stringify(await state(),null,2));};
async function move(x,y){for(let i=0;i<100;i++){const p=(await state()).player,dx=x-p.x,dy=y-p.y;if(Math.abs(dx)<3&&Math.abs(dy)<3)return;const h=Math.abs(dx)>=3;await key(h?dx>0?'ArrowRight':'ArrowLeft':dy>0?'ArrowDown':'ArrowUp',Math.min(100,Math.max(20,Math.abs(h?dx:dy)/72*1000)));}throw Error(`Cannot walk to ${x},${y}`);}
try{
 await page.goto('http://127.0.0.1:5195/?text=full');
 await page.waitForFunction(()=>window.render_game_to_text&&JSON.parse(window.render_game_to_text()).scene==='TapToStartScene');await key('Enter');
 await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).scene==='ReferralVaultScene');await page.waitForTimeout(1000);




 assert.equal((await state()).roomTraversal.currentRoomId,'R1');await shot('arrival');
 await move(32,174);await move(96,174);await key();assert.equal((await state()).sceneProgress.referralEquityPacketCarried,1);
 await move(80,148);await key();assert.equal((await state()).sceneProgress.referralEquityRouteStep,1);
 await move(128,156);await key();assert.equal((await state()).sceneProgress.referralEquityRouteStep,2);
 await move(176,148);await key();assert.equal((await state()).sceneProgress.referralEquityRouteComplete,1);await shot('routed');
 await key();await shot('manifest');assert.equal((await state()).sceneProgress.referralManifestCarried,1);
 await move(216,148);await move(216,78);await move(128,78);await key('ArrowUp',800);
 await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).roomTraversal.currentRoomId==='R3');await page.waitForTimeout(700);await shot('dispatch-arrival');
 await move(48,192);await key();await shot('index');
 await move(40,192);await move(40,80);await move(128,80);await key();await shot('receipt');
 assert.equal((await state()).sceneProgress.referralDispatchCopyFound,1);
 await move(176,80);await key();await shot('crank');assert.equal((await state()).sceneProgress.referralDispatchAisleOpen,1);
 await move(128,80);await key('ArrowDown',2300);
 await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).roomTraversal.currentRoomId==='R1');await page.waitForTimeout(700);await shot('returned');

 await context.storageState({path:`${out}/earned-storage.json`});
 assert.deepEqual(errors,[]);console.log('PASS earned equity routing, dispatch evidence, shelf shortcut and return');
}finally{await shot('last');await browser.close();}
