import { pressPortraitControl } from './portrait-input-fixture.mjs';
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
if(mobile)for(const device of [page.keyboard,page.mouse])for(const method of ['press','down','up','click','move','type'])if(typeof device[method]==='function')device[method]=()=>{throw Error(`Non-touch input: ${method}`);};
const cdp=mobile?await context.newCDPSession(page):null;
const state=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
const eastGate = async () => (await state()).roomGraph.find(room => room.id === 'R1').lockedExitState.east;
let touchBox;
const touch=async(type,points)=>{
 if(type==='touchStart')touchBox=await page.locator('canvas').first().boundingBox();
 await cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points.map(([x,y])=>({x:touchBox.x+x*touchBox.width/256,y:touchBox.y+y*touchBox.height/240,id:1}))});
};
const key=async(k='Space',ms=50)=>{
 if(mobile&&await pressPortraitControl(page,cdp,k,ms)){await page.waitForTimeout(150);return;}
 if(mobile){
  const directions={ArrowLeft:[-26,0],ArrowRight:[26,0],ArrowUp:[0,-26],ArrowDown:[0,26]};
  if(directions[k]){
   const [dx,dy]=directions[k];await touch('touchStart',[[48, 202]]);await touch('touchMove',[[48 + dx, 202 + dy]]);
  }else{
   const button=k==='x'?[174,216]:k==='Enter'?[86,154]:[225,205];
   await touch('touchStart',[button]);
  }
  await page.waitForTimeout(ms);await touch('touchEnd',[]);
 }else{await page.keyboard.down(k);await page.waitForTimeout(ms);await page.keyboard.up(k);}
 await page.waitForTimeout(150);
};
const toastPlacements=[];
const shot=async name=>{
 const placement=await page.evaluate(()=>{const s=window.game.scene.getScene('ReferralVaultScene');if(!s.scene.isActive()||!s.toast?.visible)return null;return{toast:s.toast.container.getBounds(),hero:s.player.sprite.getBounds()};});
 if(placement){const {toast:t,hero:h}=placement;assert(t.x+t.width<=h.x||t.x>=h.x+h.width||t.y+t.height<=h.y||t.y>=h.y+h.height,'Feedback must clear hero at '+name);toastPlacements.push({name,...placement});}
await page.screenshot({path:`${out}/${name}.png`});await writeFile(`${out}/${name}.json`,JSON.stringify(await state(),null,2));};
async function move(x,y){const tolerance=mobile?5:3;for(let i=0;i<100;i++){const p=(await state()).player,dx=x-p.x,dy=y-p.y;if(Math.abs(dx)<tolerance&&Math.abs(dy)<tolerance)return;const h=Math.abs(dx)>=tolerance;await key(h?dx>0?'ArrowRight':'ArrowLeft':dy>0?'ArrowDown':'ArrowUp',Math.min(100,Math.max(mobile?50:20,Math.abs(h?dx:dy)/72*1000)));}throw Error(`Cannot walk to ${x},${y}`);}
try{
 await page.goto(new URL('?text=full',process.env.FRUS_QA_URL ?? 'http://127.0.0.1:5211/').href);
 await page.waitForFunction(()=>window.render_game_to_text&&JSON.parse(window.render_game_to_text()).scene==='TapToStartScene');await key('Enter');
 await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).scene==='ReferralVaultScene');await page.waitForTimeout(1000);





 assert.equal((await state()).roomTraversal.currentRoomId,'R1');
 assert.equal((await state()).sceneProgress.referralDispatchCopyFound,1);
 await move(104,76);await move(104,156);await key();await shot('draft');
 const manifest=async(selector)=>{const e=page.locator('.referral-manifest-desk '+selector);await e.scrollIntoViewIfNeeded();if(mobile)await e.tap();else await e.click();await page.waitForTimeout(150);};
 await manifest('[data-focus-key=file]');await shot('rejected');
 assert(!(await state()).sceneProgress.referralManifestReviewComplete);
 await manifest('[data-route="2"]');await manifest('[data-route="2"]');await shot('corrected');
 await manifest('[data-focus-key=file]');await page.waitForTimeout(500);
 assert.equal((await state()).sceneProgress.referralManifestReviewComplete,1);await shot('filed');
 if(process.argv.includes('--guide-check')){
   const before=await state();
   await move(104,76);await move(50,82);await key();await shot('treatment-guide');
   const after=await state();
   assert.match(after.latestMessage,/review batch from the south tray/);
   assert.doesNotMatch(after.latestMessage,/north|dispatch|equity/i);
   assert.equal(after.objective,'TAKE REVIEW RECORDS');
   assert.equal(after.documentPoints,before.documentPoints);
   assert.equal(after.sceneProgress.referralTreatmentStep,before.sceneProgress.referralTreatmentStep);
   assert(!after.sceneProgress.referralTreatmentDocketCarried);
   await move(104,76);await move(104,156);
 }
 await key();assert.equal((await state()).sceneProgress.referralTreatmentDocketCarried,1);
 await move(104,180);await move(80,180);await key();await shot('treatment-draft');
 const treatment=async(key)=>{const e=page.locator(`.referral-treatment-desk [data-focus-key=${key}]`);await e.scrollIntoViewIfNeeded();if(mobile)await e.tap();else await e.click();await page.waitForTimeout(150);};
 await treatment('file');await shot('treatment-rejected');
 assert.equal((await state()).sceneProgress.referralTreatmentStep,0);
 await treatment('permission');await treatment('file');
 assert.equal((await state()).sceneProgress.referralTreatmentStep,0,'One corrected field is not a filed review');
 await treatment('withholding');await treatment('leave');
 assert.equal((await state()).sceneProgress.referralTreatmentStep,0,'Closing the edited draft must not file it');
 assert.equal((await state()).sceneProgress.referralTreatmentDraft,3);
 if(process.argv.includes('--reload-treatment')){
  await page.reload();await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).scene==='TapToStartScene');await key('Enter');
  await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).scene==='ReferralVaultScene');await page.waitForTimeout(600);
  assert.equal((await state()).sceneProgress.referralTreatmentDraft,3);
  assert.equal((await state()).sceneProgress.referralTreatmentStep,0);
  await shot('treatment-reloaded');
 }
 await key();await treatment('file');
 assert.equal((await state()).sceneProgress.referralTreatmentStep,2);await shot('treatment-filed');
 if(process.argv.includes('--wrong-desk')){
  const before=await state();await key();
  assert.equal((await state()).sceneProgress.referralTreatmentStep,2);
  assert.equal((await state()).sceneProgress.referralTreatmentDocketCarried,before.sceneProgress.referralTreatmentDocketCarried);
  assert.equal((await state()).reliability,before.reliability-2);
  assert.equal(await page.evaluate(()=>window.game.scene.getScene('ReferralVaultScene').toast.text.text),'USE BRACKET PRESS');
  await shot('wrong-desk-correction');
 }
 await move(128,180);await move(176,180);await key();
 assert.equal((await state()).sceneProgress.referralTreatmentStep,2);
 assert(!(await state()).sceneProgress.referralPhysicalReviewComplete);
 assert.equal((await eastGate()).canOpen,false,'Drafted treatment must not open the gate before printing');
 await page.waitForFunction(()=>window.game.scene.getScene('UIScene').questBandCueText.text==='STAMP THE BRACKET PRESS');
 assert.equal(await page.evaluate(()=>window.game.scene.getScene('UIScene').questBandVerbText.text),mobile?'B':'X');
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
 await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).scene==='SilentReadScene');await page.waitForTimeout(700);
 assert.equal((await state()).roomTraversal.currentRoomId,'E1','Referral handoff enters editorial repair before the proof room');
 await shot('editor-arrival');

 await context.storageState({path:`${out}/earned-storage.json`});
 await writeFile(`${out}/result.json`,JSON.stringify({mobile,manifestCorrected:true,treatmentDraftRestored:process.argv.includes('--reload-treatment'),withholdingTreatmentFiled:true,bracketPressVerified:true,noDuplicateReward:true,editorialRoomReached:true,toastPlacements,errors},null,2));
 assert.deepEqual(errors,[]);console.log(`PASS ${mobile?'touch-only':'keyboard'} earned manifest correction, treatment, Concurrence Slip and editorial arrival`);
}finally{
 try{await shot('last');}catch(error){console.error('Final screenshot unavailable:',error.message);}
 await browser.close();
}
