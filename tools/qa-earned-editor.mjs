const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
assert(process.env.FRUS_QA_STORAGE, 'Provide the preceding earned checkpoint via FRUS_QA_STORAGE');
const out=process.env.FRUS_QA_OUT ?? '/private/tmp/frus-earned-editor';await mkdir(out,{recursive:true});
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
 await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).scene==='SilentReadScene');await page.waitForTimeout(1000);

 assert.equal((await state()).roomTraversal.currentRoomId,'E1');await shot('arrival');
 await move(30,202);await move(56,202);await key();await shot('carried');
 await move(96,202);await move(96,185);await move(128,185);await key();await shot('editor-check');
 console.log(JSON.stringify((await state()).choice));
 await key('ArrowDown');await key();await shot('invisible-rejected');
 assert(!(await state()).inventory.includes('Red Pencil'));
 await key('ArrowUp');await key();await shot('bracket-added');
 await key();await page.waitForTimeout(300);await shot('draft-filed');
 assert(!(await state()).inventory.includes('Red Pencil'));
 await key();await page.waitForTimeout(500);await shot('pencil-earned');
 assert((await state()).inventory.includes('Red Pencil'));
 await move(226,185);await move(226,124);await key('ArrowRight',900);
 await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).roomTraversal.currentRoomId==='S1');await page.waitForTimeout(700);await shot('proof-room');

 await context.storageState({path:`${out}/earned-storage.json`});
 assert.deepEqual(errors,[]);console.log('PASS earned bracket repair, Red Pencil, and proof room arrival');
}finally{await shot('last');await browser.close();}
