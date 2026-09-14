const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
assert(process.env.FRUS_QA_STORAGE, 'Provide the preceding earned checkpoint via FRUS_QA_STORAGE');
const out=process.env.FRUS_QA_OUT ?? '/private/tmp/frus-earned-production';await mkdir(out,{recursive:true});
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
   const [dx,dy]=directions[k];await touch('touchStart',[[40,178]]);await touch('touchMove',[[40+dx,178+dy]]);
  }else{await touch('touchStart',[k==='Enter'?[86,154]:[225,205]]);}
  await page.waitForTimeout(ms);await touch('touchEnd',[]);
 }else{await page.keyboard.down(k);await page.waitForTimeout(ms);await page.keyboard.up(k);}
 await page.waitForTimeout(150);
};
const tap=async(x,y)=>{await touch('touchStart',[[x,y]]);await page.waitForTimeout(50);await touch('touchEnd',[]);await page.waitForTimeout(150);};
const shot=async name=>{const data=await page.evaluate(()=>new Promise(r=>window.game.renderer.snapshot(i=>r(i.src))));await writeFile(`${out}/${name}.png`,Buffer.from(data.split(',')[1],'base64'));await writeFile(`${out}/${name}.json`,JSON.stringify(await state(),null,2));};
async function move(x,y){const tolerance=mobile?5:3;for(let i=0;i<100;i++){const p=(await state()).player,dx=x-p.x,dy=y-p.y;if(Math.abs(dx)<tolerance&&Math.abs(dy)<tolerance)return;const h=Math.abs(dx)>=tolerance;await key(h?dx>0?'ArrowRight':'ArrowLeft':dy>0?'ArrowDown':'ArrowUp',Math.min(180,Math.max(16,Math.abs(h?dx:dy)*6)));}throw Error(`Cannot walk to ${x},${y}`);}
try {
 await page.goto('http://127.0.0.1:5195/?text=full');
 await page.waitForFunction(()=>window.render_game_to_text&&JSON.parse(window.render_game_to_text()).scene==='TapToStartScene');await key('Enter');
 await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).scene==='SilentReadScene');await page.waitForTimeout(700);
 assert.equal((await state()).sceneProgress.silentReadReviewStep,5);await shot('arrival');
 if(process.argv.includes('--wrong-desk')){
  await move(192,140);await key();await shot('wrong-desk-correction');
  assert.equal((await state()).sceneProgress.silentReadReviewStep,5);
  assert.equal(await page.evaluate(()=>window.game.scene.getScene('SilentReadScene').toast.text.text),'USE CONSULT DESK');
 }
 await move(96,132);await move(64,132);await key();await shot('margin-question');
 // Generic choices are directly tappable; the floating-pad origin overlaps
 // the bottom answer, so do not simulate menu navigation through that area.
 if(mobile)await tap(100,145);else{await key('ArrowDown');await key();}
 await key();await shot('margin-stamped');
 assert.equal((await state()).sceneProgress.silentReadReviewStep,6);
 await move(128,132);await key();await shot('index-question');
 if(mobile)await tap(100,120);else await key();
 await key();await shot('index-stamped');
 assert.equal((await state()).sceneProgress.silentReadReviewStep,7);
 await move(192,132);await key();await shot('proof-comparison');
 await key('ArrowLeft');await key();await shot('altered-proof-rejected');
 assert(!(await state()).inventory.includes('Buckram Key'));
 await key('ArrowRight');await key();await key('ArrowRight');await key('ArrowRight');await key();
 await key('ArrowRight');await key('ArrowRight');await key();await shot('proof-filed');
 assert(!(await state()).inventory.includes('Buckram Key'));
 await key();await page.waitForTimeout(500);await shot('key-earned');
 assert((await state()).inventory.includes('Buckram Key'));
 await move(228,132);await move(228,120);await key('ArrowRight',1200);
 await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).scene==='BlackVaultLairScene');await page.waitForTimeout(1000);await shot('vault-arrival');
 await context.storageState({path:`${out}/earned-storage.json`});
 assert.deepEqual(errors,[]);console.log('PASS earned Buckram Key and final vault arrival');
} finally {await shot('last');await browser.close();}
