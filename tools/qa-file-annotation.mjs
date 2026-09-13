const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const out=process.env.FRUS_QA_OUT ?? '/private/tmp/frus-file-annotation';await mkdir(out,{recursive:true});
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
 await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).scene==='ArchiveScene');await page.waitForTimeout(1000);
 assert.equal((await state()).sceneProgress.annotationGatheredMask,7);await shot('arrival');
 await move(72,76);await move(72,154);await move(128,154);await key();await shot('review');
 console.log(JSON.stringify((await state()).choice));
 await page.waitForTimeout(500);await key('ArrowDown');await key();await page.waitForTimeout(600);await shot('filed');
 assert.equal((await state()).sceneProgress.annotationDraftingComplete,1);
 assert.equal((await state()).objective,'PICK UP TELEGRAM');
 assert.match((await state()).latestMessage,/Source, context, and selection notes filed together/);
 await context.storageState({path:`${out}/earned-storage.json`});
 assert.deepEqual(errors,[]);console.log('PASS earned annotation packet filed');
}finally{await shot('last');await browser.close();}
