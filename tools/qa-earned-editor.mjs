const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
assert(process.env.FRUS_QA_STORAGE, 'Provide the preceding earned checkpoint via FRUS_QA_STORAGE');
const out=process.env.FRUS_QA_OUT ?? '/private/tmp/frus-earned-editor';await mkdir(out,{recursive:true});
const mobile=process.argv.includes('--mobile');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE});
const context=await browser.newContext({storageState:process.env.FRUS_QA_STORAGE,
 viewport:mobile?{width:375,height:667}:{width:1024,height:960},hasTouch:mobile,isMobile:mobile,deviceScaleFactor:mobile?3:1});
const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e)));
page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
const cdp=mobile?await context.newCDPSession(page):null;
const state=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
const touch=async(type,points)=>{
 const box=await page.locator('canvas').first().boundingBox();
 await cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points.map(([x,y])=>({x:box.x+x*box.width/256,y:box.y+y*box.height/240,id:1}))});
};
const key=async(k='Space',ms=50)=>{
 if(mobile){
  const directions={ArrowLeft:[-26,0],ArrowRight:[26,0],ArrowUp:[0,-26],ArrowDown:[0,26]};
  if(directions[k]){
   const [dx,dy]=directions[k];await touch('touchStart',[[48, 202]]);await touch('touchMove',[[48 + dx, 202 + dy]]);
  }else{await touch('touchStart',[k==='x'?[174,216]:k==='Enter'?[86,154]:[225,205]]);}
  await page.waitForTimeout(ms);await touch('touchEnd',[]);
 }else{await page.keyboard.down(k);await page.waitForTimeout(ms);await page.keyboard.up(k);}
 await page.waitForTimeout(150);
};
const shot=async name=>{const data=await page.evaluate(()=>new Promise(r=>window.game.renderer.snapshot(i=>r(i.src))));await writeFile(`${out}/${name}.png`,Buffer.from(data.split(',')[1],'base64'));await writeFile(`${out}/${name}.json`,JSON.stringify(await state(),null,2));if(mobile)await page.screenshot({path:`${out}/${name}-phone.png`});};
async function move(x,y){const tolerance=mobile?5:3;for(let i=0;i<100;i++){const p=(await state()).player,dx=x-p.x,dy=y-p.y;if(Math.abs(dx)<tolerance&&Math.abs(dy)<tolerance)return;const h=Math.abs(dx)>=tolerance;await key(h?dx>0?'ArrowRight':'ArrowLeft':dy>0?'ArrowDown':'ArrowUp',Math.min(100,Math.max(mobile?50:20,Math.abs(h?dx:dy)/72*1000)));}throw Error(`Cannot walk to ${x},${y}`);}
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
 if(process.argv.includes('--reload-bracket')){
  const drafted=await state();
  assert.equal(drafted.sceneProgress.silentReadBracketDraft,1);
  assert(!drafted.inventory.includes('Red Pencil'));
  await key('x');
  await page.reload();await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).scene==='TapToStartScene');await key('Enter');
  await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).scene==='SilentReadScene');await page.waitForTimeout(600);
  const restored=await state();
  assert.equal(restored.roomTraversal.currentRoomId,'E1');
  assert.equal(restored.sceneProgress.silentReadBracketDraft,1);
  assert.equal(restored.documentPoints,drafted.documentPoints);
  assert(!restored.inventory.includes('Red Pencil'),'A saved draft must not grant its tool before verification');
  await key();await shot('bracket-reloaded');
 }
 await key();await page.waitForTimeout(300);await shot('draft-filed');
 assert(!(await state()).inventory.includes('Red Pencil'));
 await key();await page.waitForTimeout(100);await shot('pencil-earned');
 assert((await state()).inventory.includes('Red Pencil'));
 assert(await page.evaluate(()=>window.game.scene.getScene('SilentReadScene').children.list.some(object=>object.name==='snes-reward-burst'&&object.active)), 'Red Pencil reward must survive the room redraw');
 await move(226,185);await move(226,124);await key('ArrowRight',900);
 await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).roomTraversal.currentRoomId==='S1');await page.waitForTimeout(700);await shot('proof-room');

 await context.storageState({path:`${out}/earned-storage.json`});
 assert.deepEqual(errors,[]);console.log(`PASS ${mobile?'touch-only':'keyboard'} earned bracket repair, Red Pencil, and proof room arrival`);
}finally{await shot('last');await browser.close();}
