const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
assert(process.env.FRUS_QA_STORAGE, 'Provide an earned filed-annotation checkpoint');
const out=process.env.FRUS_QA_OUT ?? '/private/tmp/frus-earned-network';await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE});
const context=await browser.newContext({storageState:process.env.FRUS_QA_STORAGE});
const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e)));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
const state=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
const eastGate = async () => (await state()).roomGraph.find(room => room.id === 'A1').lockedExitState.east;
const key=async(k='Space',ms=50)=>{await page.keyboard.down(k);await page.waitForTimeout(ms);await page.keyboard.up(k);await page.waitForTimeout(150);};
const shot=async name=>{const data=await page.evaluate(()=>new Promise(r=>window.game.renderer.snapshot(i=>r(i.src))));await writeFile(`${out}/${name}.png`,Buffer.from(data.split(',')[1],'base64'));await writeFile(`${out}/${name}.json`,JSON.stringify(await state(),null,2));};
async function move(x,y){for(let i=0;i<100;i++){const p=(await state()).player,dx=x-p.x,dy=y-p.y;if(Math.abs(dx)<3&&Math.abs(dy)<3)return;const h=Math.abs(dx)>=3;await key(h?dx>0?'ArrowRight':'ArrowLeft':dy>0?'ArrowDown':'ArrowUp',Math.min(100,Math.max(20,Math.abs(h?dx:dy)/72*1000)));}throw Error(`Cannot walk to ${x},${y}`);}
try{
 await page.goto('http://127.0.0.1:5195/?text=full');
 await page.waitForFunction(()=>window.render_game_to_text&&JSON.parse(window.render_game_to_text()).scene==='TapToStartScene');await key('Enter');
 await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).scene==='ArchiveScene');await page.waitForTimeout(1000);

 assert.equal((await state()).sceneProgress.annotationDraftingComplete,1);await shot('arrival');
 assert((await state()).inventory.includes('Citation Stamp'));
 assert.equal((await eastGate()).canOpen,false,'Filed annotations and a stamp do not replace supporting documents');
 await move(72,154);await move(72,142);await key();await shot('telegram');
 assert.equal((await state()).sceneProgress.archiveTelegramCollected,1);
 assert.equal((await eastGate()).canOpen,false,'One supporting document is not a complete packet');
 await move(72,154);await move(184,154);await move(184,142);await key();await shot('cross-reference');
 assert.equal((await state()).sceneProgress.archiveCrossReferenceCollected,1);
 assert.equal((await state()).sceneProgress.archiveSourceRoomComplete,1);
 assert.equal((await eastGate()).canOpen,true,'The map must open with the actual completed packet');
 await move(216,142);await move(216,120);await key('ArrowRight',1500);
 await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).scene==='NetworkScene');
 await page.waitForTimeout(800);await shot('network');

 await context.storageState({path:`${out}/earned-storage.json`});
 assert.deepEqual(errors,[]);console.log('PASS earned supporting documents and east network route');
}finally{await shot('last');await browser.close();}
