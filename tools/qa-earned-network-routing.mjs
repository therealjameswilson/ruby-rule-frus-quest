const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const out=process.env.FRUS_QA_OUT ?? '/private/tmp/frus-network-crossing-earned';await mkdir(out,{recursive:true});
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
 await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).scene==='NetworkScene');await page.waitForTimeout(1000);


 await shot('arrival');
 await move(96,178);await key();await shot('public-carried');
 assert.equal((await state()).sceneProgress.networkRoutingCarried,1);
 await move(96,140);await key();await shot('public-filed');
 assert.equal((await state()).sceneProgress.networkRoutingStep,1);
 await move(96,124);await key('ArrowRight',100);await key('x');await page.waitForTimeout(600);await shot('crossing');
 assert.equal((await state()).sceneProgress.networkStampCrossingOpen,1);
 await move(96,124);await key();
 assert.equal((await state()).sceneProgress.networkRoutingStep,2);
 await move(164,124);await key();
 assert.equal((await state()).sceneProgress.networkRoutingStep,3);
 await key();await page.waitForTimeout(600);
 assert.equal((await state()).sceneProgress.networkRoutingComplete,1);await shot('routing-complete');
 await move(216,124);await key('ArrowRight',1200);
 await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).roomTraversal.currentRoomId==='N2');
 await page.waitForTimeout(700);await shot('vault-arrival');
 await page.reload();
 await page.waitForFunction(()=>window.render_game_to_text&&JSON.parse(window.render_game_to_text()).scene==='TapToStartScene');await key('Enter');
 await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).scene==='NetworkScene');await page.waitForTimeout(800);
 assert.equal((await state()).roomTraversal.currentRoomId,'N2');
 const restoredX=(await state()).player.x;
 await key('ArrowRight',100);
 assert((await state()).player.x>restoredX);
 await shot('vault-restored');

 await context.storageState({path:`${out}/earned-storage.json`});
 assert.deepEqual(errors,[]);console.log('PASS four earned routing deliveries, Citation Stamp crossing and ClassNet Vault arrival');
}finally{await shot('last');await browser.close();}
