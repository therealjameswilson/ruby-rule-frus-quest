const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
assert(process.env.FRUS_QA_STORAGE, 'Provide the preceding earned checkpoint via FRUS_QA_STORAGE');
const out=process.env.FRUS_QA_OUT ?? '/private/tmp/frus-earned-referral';await mkdir(out,{recursive:true});
const mobile=process.argv.includes('--mobile');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE});
const context=await browser.newContext({storageState:process.env.FRUS_QA_STORAGE,
 viewport:mobile?{width:375,height:667}:{width:1024,height:960},hasTouch:mobile,isMobile:mobile,deviceScaleFactor:mobile?3:1});
const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e)));
page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
const cdp=mobile?await context.newCDPSession(page):null;
const state=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
let touchBox;
const touch=async(type,points)=>{
 // Layout reads during a held gesture delay touchEnd and extend movement.
 if(type==='touchStart')touchBox=await page.locator('canvas').first().boundingBox();
 await cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points.map(([x,y])=>({x:touchBox.x+x*touchBox.width/256,y:touchBox.y+y*touchBox.height/240,id:1}))});
};
const key=async(k='Space',ms=50)=>{
 if(mobile){
  const directions={ArrowLeft:[-26,0],ArrowRight:[26,0],ArrowUp:[0,-26],ArrowDown:[0,26]};
  if(directions[k]){
   const [dx,dy]=directions[k];await touch('touchStart',[[48, 202]]);await touch('touchMove',[[48 + dx, 202 + dy]]);
  }else{await touch('touchStart',[k==='Enter'?[86,154]:[225,205]]);}
  await page.waitForTimeout(ms);await touch('touchEnd',[]);
 }else{await page.keyboard.down(k);await page.waitForTimeout(ms);await page.keyboard.up(k);}
 await page.waitForTimeout(150);
};
const shot=async name=>{const data=await page.evaluate(()=>new Promise(r=>window.game.renderer.snapshot(i=>r(i.src))));await writeFile(`${out}/${name}.png`,Buffer.from(data.split(',')[1],'base64'));await writeFile(`${out}/${name}.json`,JSON.stringify(await state(),null,2));};
async function move(x,y,interaction){
 const tolerance=mobile?5:3;
 let lastDistance=Infinity;
 console.log(`Walking to ${interaction??`${x},${y}`}`);
 for(let i=0;i<100;i++){
  const current=await state();
  if(interaction&&current.nearestInteractable===interaction)return;
  const p=current.player,dx=x-p.x,dy=y-p.y;
  if(Math.abs(dx)<tolerance&&Math.abs(dy)<tolerance)return;
  const distance=Math.hypot(dx,dy);
  // Try the other needed axis when furniture or knockback defeats the first approach.
  const stalled=distance>=lastDistance-.5;
  const h=Math.abs(dx)>=tolerance && !(stalled&&Math.abs(dy)>=tolerance);
  lastDistance=distance;
  await key(h?dx>0?'ArrowRight':'ArrowLeft':dy>0?'ArrowDown':'ArrowUp',
   Math.min(100,Math.max(mobile?50:20,Math.abs(h?dx:dy)/72*1000)));
 }
 throw Error(`Cannot walk to ${x},${y}`);
}
try{
 await page.goto(new URL('?text=full',process.env.FRUS_QA_URL ?? 'http://127.0.0.1:5195/').href);
 await page.waitForFunction(()=>window.render_game_to_text&&JSON.parse(window.render_game_to_text()).scene==='TapToStartScene');await key('Enter');
 await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).scene==='ReferralVaultScene');await page.waitForTimeout(1000);




 assert.equal((await state()).roomTraversal.currentRoomId,'R1');await shot('arrival');
 await move(32,174);await move(96,174);await key();assert.equal((await state()).sceneProgress.referralEquityPacketCarried,1);
 await move(80,148,'CIA equity desk');await key();assert.equal((await state()).sceneProgress.referralEquityRouteStep,1);
 if(process.argv.includes('--wrong-desk')){
  const before=await state();await key();
  assert.equal((await state()).sceneProgress.referralEquityRouteStep,1);
  assert.equal((await state()).sceneProgress.referralEquityPacketCarried,before.sceneProgress.referralEquityPacketCarried);
  assert.equal((await state()).reliability,before.reliability-2);
  assert.match(await page.evaluate(()=>window.game.scene.getScene('ReferralVaultScene').toast.text.text),/^ROUTE TO /);
  await shot('wrong-agency-correction');
 }
 await move(128,156,'DOD equity desk');await key();assert.equal((await state()).sceneProgress.referralEquityRouteStep,2);
 await move(176,148,'NSC equity desk');await key();assert.equal((await state()).sceneProgress.referralEquityRouteComplete,1);await shot('routed');
 await move(178,140,'StateChat draft manifest');await key();await shot('manifest');assert.equal((await state()).sceneProgress.referralManifestCarried,1);
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
