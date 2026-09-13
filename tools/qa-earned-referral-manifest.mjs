const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
assert(process.env.FRUS_QA_STORAGE, 'Provide the preceding earned checkpoint via FRUS_QA_STORAGE');
const out=process.env.FRUS_QA_OUT ?? '/private/tmp/frus-earned-manifest';await mkdir(out,{recursive:true});
const mobile=process.argv.includes('--mobile');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE});
const context=await browser.newContext({storageState:process.env.FRUS_QA_STORAGE,
 viewport:mobile?{width:375,height:667}:{width:1024,height:960},hasTouch:mobile,isMobile:mobile,deviceScaleFactor:mobile?3:1});
const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e)));
page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
const cdp=mobile?await context.newCDPSession(page):null;
const state=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
const eastGate = async () => (await state()).roomGraph.find(room => room.id === 'R1').lockedExitState.east;
const touch=async(type,points)=>{
 const box=await page.locator('canvas').first().boundingBox();
 await cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points.map(([x,y])=>({x:box.x+x*box.width/256,y:box.y+y*box.height/240,id:1}))});
};
const key=async(k='Space',ms=50)=>{
 if(mobile){
  const directions={ArrowLeft:[-26,0],ArrowRight:[26,0],ArrowUp:[0,-26],ArrowDown:[0,26]};
  if(directions[k]){
   const [dx,dy]=directions[k];await touch('touchStart',[[40,178]]);await touch('touchMove',[[40+dx,178+dy]]);
  }else{
   const button=k==='x'?[174,216]:k==='Enter'?[86,154]:[225,205];
   await touch('touchStart',[button]);
  }
  await page.waitForTimeout(ms);await touch('touchEnd',[]);
 }else{await page.keyboard.down(k);await page.waitForTimeout(ms);await page.keyboard.up(k);}
 await page.waitForTimeout(150);
};
const shot=async name=>{const data=await page.evaluate(()=>new Promise(r=>window.game.renderer.snapshot(i=>r(i.src))));await writeFile(`${out}/${name}.png`,Buffer.from(data.split(',')[1],'base64'));await writeFile(`${out}/${name}.json`,JSON.stringify(await state(),null,2));if(mobile)await page.screenshot({path:`${out}/${name}-phone.png`});};
async function move(x,y){const tolerance=mobile?5:3;for(let i=0;i<100;i++){const p=(await state()).player,dx=x-p.x,dy=y-p.y;if(Math.abs(dx)<tolerance&&Math.abs(dy)<tolerance)return;const h=Math.abs(dx)>=tolerance;await key(h?dx>0?'ArrowRight':'ArrowLeft':dy>0?'ArrowDown':'ArrowUp',Math.min(100,Math.max(mobile?50:20,Math.abs(h?dx:dy)/72*1000)));}throw Error(`Cannot walk to ${x},${y}`);}
try{
 await page.goto('http://127.0.0.1:5195/?text=full');
 await page.waitForFunction(()=>window.render_game_to_text&&JSON.parse(window.render_game_to_text()).scene==='TapToStartScene');await key('Enter');
 await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).scene==='ReferralVaultScene');await page.waitForTimeout(1000);





 assert.equal((await state()).roomTraversal.currentRoomId,'R1');
 assert.equal((await state()).sceneProgress.referralDispatchCopyFound,1);
 await move(104,76);await move(104,156);await key();await shot('draft');
 await key('ArrowDown');await key('ArrowDown');await key('ArrowDown');await key();await shot('rejected');
 assert(!(await state()).sceneProgress.referralManifestReviewComplete);
 await key('ArrowLeft');await shot('corrected');await key('ArrowDown');await key();await page.waitForTimeout(500);
 assert.equal((await state()).sceneProgress.referralManifestReviewComplete,1);await shot('filed');
 if(process.argv.includes('--guide-check')){
   const before=await state();
   await move(104,76);await move(50,82);await key();await shot('treatment-guide');
   const after=await state();
   assert.match(after.latestMessage,/review batch from the south tray/);
   assert.doesNotMatch(after.latestMessage,/north|dispatch|equity/i);
   assert.equal(after.objective,'TAKE REVIEW BATCH');
   assert.equal(after.documentPoints,before.documentPoints);
   assert.equal(after.sceneProgress.referralTreatmentStep,before.sceneProgress.referralTreatmentStep);
   assert(!after.sceneProgress.referralTreatmentDocketCarried);
   await move(104,76);await move(104,156);
 }
 await key();assert.equal((await state()).sceneProgress.referralTreatmentDocketCarried,1);
 await move(104,180);await move(80,180);await key();await shot('treatment-draft');
 await key('ArrowDown');await key('ArrowDown');await key();await shot('treatment-rejected');
 assert.equal((await state()).sceneProgress.referralTreatmentStep,0);
 await key('ArrowUp');await key('ArrowUp');await key();
 await key('ArrowDown');await key('ArrowDown');await key();
 assert.equal((await state()).sceneProgress.referralTreatmentStep,0,'One corrected field is not a filed review');
 await key('ArrowUp');await key();await key('x');
 assert.equal((await state()).sceneProgress.referralTreatmentStep,0,'Closing the edited draft must not file it');
 assert.equal((await state()).sceneProgress.referralTreatmentDraft,3);
 if(process.argv.includes('--reload-treatment')){
  await page.reload();await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).scene==='TapToStartScene');await key('Enter');
  await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).scene==='ReferralVaultScene');await page.waitForTimeout(600);
  assert.equal((await state()).sceneProgress.referralTreatmentDraft,3);
  assert.equal((await state()).sceneProgress.referralTreatmentStep,0);
  await shot('treatment-reloaded');
 }
 await key();await key('ArrowDown');await key('ArrowDown');await key();
 assert.equal((await state()).sceneProgress.referralTreatmentStep,2);await shot('treatment-filed');
 await move(128,180);await move(176,180);await key();
 assert.equal((await state()).sceneProgress.referralTreatmentStep,2);
 assert(!(await state()).sceneProgress.referralPhysicalReviewComplete);
 assert.equal((await eastGate()).canOpen,false,'Drafted treatment must not open the gate before printing');
 await shot('press-ready');
 await key('ArrowDown',30);await key('x');await page.waitForTimeout(450);
 assert.equal((await state()).sceneProgress.referralTreatmentStep,2,'A swing facing away must not print');
 await move(176,184);await move(196,184);
 await key();
 await key('x');await page.waitForTimeout(500);await shot('treatment-complete');
 assert.equal((await state()).sceneProgress.referralPhysicalReviewComplete,1);
 assert.equal((await eastGate()).canOpen,true,'Printing the reviewed treatment must also open the map gate');
 const printedPoints=(await state()).documentPoints;
 await key('x');await page.waitForTimeout(500);
 assert.equal((await state()).documentPoints,printedPoints,'Repeated swings must not duplicate press rewards');
 await move(232,180);await move(232,120);await key('ArrowRight',1200);
 await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).roomTraversal.currentRoomId==='R2');await page.waitForTimeout(700);await shot('reward-room');
 await move(100,132);await key();await shot('slip');assert((await state()).inventory.includes('Concurrence Slip'));
 await move(216,132);await move(216,120);await key('ArrowRight',1200);
 await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).scene==='SilentReadScene');await page.waitForTimeout(700);await shot('proof-arrival');

 await context.storageState({path:`${out}/earned-storage.json`});
 assert.deepEqual(errors,[]);console.log(`PASS ${mobile?'touch-only':'keyboard'} earned manifest correction, treatment, Concurrence Slip and proofing arrival`);
}finally{await shot('last');await browser.close();}
