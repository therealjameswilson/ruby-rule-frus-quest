const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
assert(process.env.FRUS_QA_STORAGE, 'Provide the preceding earned checkpoint via FRUS_QA_STORAGE');
const out=process.env.FRUS_QA_OUT ?? '/private/tmp/frus-earned-proof'; await mkdir(out,{recursive:true});
const mobile=process.argv.includes('--mobile');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE});
const context=await browser.newContext({storageState:process.env.FRUS_QA_STORAGE,
 viewport:mobile?{width:375,height:667}:{width:1024,height:960},hasTouch:mobile,isMobile:mobile,deviceScaleFactor:mobile?3:1});
const page=await context.newPage(); const errors=[]; page.on('pageerror',e=>errors.push(String(e)));
page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
const cdp=mobile?await context.newCDPSession(page):null;
const state=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
const tap=async(x,y)=>{
 const box=await page.locator('canvas').first().boundingBox();
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+x*box.width/256,y:box.y+y*box.height/240,id:1}]});
 await page.waitForTimeout(50);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await page.waitForTimeout(150);
};
const key=async(k='Space',ms=50)=>{
 if(mobile){
  const box=await page.locator('canvas').first().boundingBox();
  const point=(x,y)=>({x:box.x+x*box.width/256,y:box.y+y*box.height/240,id:1});
  const dirs={ArrowLeft:[-26,0],ArrowRight:[26,0],ArrowUp:[0,-26],ArrowDown:[0,26]};
  const origin=dirs[k]?[40,178]:k==='Enter'?[86,154]:k==='x'?[174,216]:[225,205];
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point(...origin)]});
  if(dirs[k])await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[point(origin[0]+dirs[k][0],origin[1]+dirs[k][1])]});
  await page.waitForTimeout(ms);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 }else{await page.keyboard.down(k);await page.waitForTimeout(ms);await page.keyboard.up(k);}
 await page.waitForTimeout(150);
};
const shot=async name=>{const data=await page.evaluate(()=>new Promise(r=>window.game.renderer.snapshot(i=>r(i.src))));await writeFile(`${out}/${name}.png`,Buffer.from(data.split(',')[1],'base64'));await writeFile(`${out}/${name}.json`,JSON.stringify(await state(),null,2));if(mobile)await page.screenshot({path:`${out}/${name}-phone.png`});};
async function move(x,y){const tolerance=mobile?5:3;for(let i=0;i<100;i++){const p=(await state()).player,dx=x-p.x,dy=y-p.y;if(Math.abs(dx)<tolerance&&Math.abs(dy)<tolerance)return;const h=Math.abs(dx)>=tolerance;await key(h?dx>0?'ArrowRight':'ArrowLeft':dy>0?'ArrowDown':'ArrowUp',Math.min(100,Math.max(mobile?50:20,Math.abs(h?dx:dy)/72*1000)));}throw Error(`Cannot walk to ${x},${y}`);}
try {
 await page.goto('http://127.0.0.1:5195/?text=full');
 await page.waitForFunction(()=>window.render_game_to_text&&JSON.parse(window.render_game_to_text()).scene==='TapToStartScene');await key('Enter');
 await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).scene==='SilentReadScene');await page.waitForTimeout(1000);
 assert.equal((await state()).roomTraversal.currentRoomId,'S1');await shot('arrival');
 await move(96,124);await move(96,198);await move(128,198);await key();
 await move(96,198);await move(96,132);await move(48,132);await key();await shot('catalog');
 assert((await state()).choice);
 await key();await key();await shot('wrong-reference');
 assert.equal((await state()).sceneProgress.silentReadReviewStep,1);
 await key('ArrowLeft');await key('ArrowLeft');await key();await key();await shot('reference-filed');
 await key();await shot('reference-stamped');
 assert.equal((await state()).sceneProgress.silentReadReviewStep,2);
 await move(96,132);await move(208,132);await key();await shot('release');
 await key('ArrowLeft');await key();await shot('over-release-rejected');
 assert.equal((await state()).sceneProgress.silentReadReviewStep,2);
 await key('ArrowRight');await key();await key('ArrowRight');await key('ArrowRight');await key();
 await key('ArrowRight');await key();await key();await shot('release-stamped');
 assert.equal((await state()).sceneProgress.silentReadReviewStep,3);
 await move(96,132);await move(64,132);await key();await shot('withheld-entry');
 await key();await key();await shot('referral-stamped');
 assert.equal((await state()).sceneProgress.silentReadReviewStep,4);
 await move(96,132);await move(192,132);await key();await shot('chronology');
 // This board hides the floating controls; use its visible file/shift buttons.
 if(mobile)await tap(104,168);else{await key('ArrowDown');await key();}
 await shot('draft-date-rejected');
 assert((await state()).choice, 'Invalid chronology must leave the correction board open');
 assert.equal((await state()).sceneProgress.silentReadReviewStep,4);
 assert(!(await state()).inventory.includes('Proof Lens'));
 if(mobile){await tap(34,168);await tap(104,168);}else{await key('ArrowLeft');await key('ArrowDown');await key();}
 await shot('chronology-filed');
 assert(!(await state()).inventory.includes('Proof Lens'));
 await key();await page.waitForTimeout(100);await shot('lens-earned');
 assert((await state()).inventory.includes('Proof Lens'));
 assert(await page.evaluate(()=>window.game.scene.getScene('SilentReadScene').children.list.some(object=>object.name==='snes-reward-burst'&&object.active)), 'Proof Lens reward must survive the production-layout redraw');
 assert.equal((await state()).sceneProgress.silentReadReviewStep,5);
 await context.storageState({path:`${out}/earned-storage.json`});
 await page.reload();await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).scene==='TapToStartScene');await key('Enter');
 await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).scene==='SilentReadScene');await page.waitForTimeout(600);
 assert.equal((await state()).roomTraversal.currentRoomId,'S1');
 assert.equal((await state()).sceneProgress.silentReadReviewStep,5);
 assert((await state()).inventory.includes('Proof Lens'));await shot('lens-reloaded');
 assert.deepEqual(errors,[]);console.log(`PASS ${mobile?'touch-only':'keyboard'} earned Proof Lens, rejected drafts, and saved production handoff`);
} finally {await shot('last');await browser.close();}
