const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
assert(process.env.FRUS_QA_STORAGE, 'Provide the preceding earned checkpoint via FRUS_QA_STORAGE');
const out=process.env.FRUS_QA_OUT ?? '/private/tmp/frus-earned-clearance';await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE});
const mobile=process.argv.includes('--mobile');
const context=await browser.newContext({storageState:process.env.FRUS_QA_STORAGE,...(mobile?{viewport:{width:375,height:667},hasTouch:true,isMobile:true}:{})});
const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e)));
page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
const state=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
const gateLabels = () => page.evaluate(() => window.game.scene.getScene('NetworkScene').roomGateObjects
 .filter(object => typeof object.text === 'string').map(object => object.text));
const westGate = async () => (await state()).roomGraph.find(room => room.id === 'N2').lockedExitState.west;
const shot=async name=>{await page.screenshot({path:`${out}/${name}.png`});await writeFile(`${out}/${name}.json`,JSON.stringify(await state(),null,2));};
const cdp=await context.newCDPSession(page);
if(mobile)for(const device of [page.keyboard,page.mouse])for(const method of ['press','down','up','click','move','type','insertText']){
 if(typeof device[method]==='function')device[method]=()=>{throw Error(`Non-touch input: ${method}`);};
}
const point=async(x,y)=>{const r=await page.locator('canvas').first().boundingBox();return{x:r.x+x*r.width/256,y:r.y+y*r.height/240};};
const tap=async(x,y)=>{const p=await point(x,y);await page.touchscreen.tap(p.x,p.y);};
const hold=async(key,ms)=>{
 if(!mobile){await page.keyboard.down(key);await page.waitForTimeout(ms);await page.keyboard.up(key);return;}
 const [dx,dy]={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[key];
 let p;
 if(await page.locator('#portrait-touch-dock').isVisible()){
  const r=await page.locator('.portrait-dpad').boundingBox();p={x:r.x+r.width*(.5+dx*.35),y:r.y+r.height*(.5+dy*.35)};
 }else p=await point(48+dx*26,202+dy*26);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...p,id:1}]});await page.waitForTimeout(ms);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
};
const key=async(key='Space',duration=50)=>{
 if(!mobile)await page.keyboard.press(key,{delay:duration});
 else if(key.startsWith('Arrow'))await hold(key,duration);
 else if((await state()).scene==='TapToStartScene')await tap(86,154);
 else if(await page.locator('#portrait-touch-dock').isVisible())await page.locator('#portrait-touch-dock [data-control="space"]').tap();
 else await tap(225,205);
 await page.waitForTimeout(200);
};
async function move(x,y){for(let i=0;i<100;i++){const p=(await state()).player,dx=x-p.x,dy=y-p.y;if(Math.abs(dx)<4&&Math.abs(dy)<4)return;const horizontal=Math.abs(dx)>=4;const k=horizontal?dx>0?'ArrowRight':'ArrowLeft':dy>0?'ArrowDown':'ArrowUp';await hold(k,Math.min(80,Math.max(12,Math.abs(horizontal?dx:dy)*5)));await page.waitForTimeout(30);}throw Error(`Cannot walk to ${x},${y}`);}
try{
 await page.goto(new URL('?text=full',process.env.FRUS_QA_URL ?? 'http://127.0.0.1:5195/').href);
 await page.waitForFunction(()=>window.render_game_to_text&&JSON.parse(window.render_game_to_text()).scene==='TapToStartScene');await key('Enter');
 await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).scene==='NetworkScene');await page.waitForTimeout(1000);



 assert.equal((await state()).roomTraversal.currentRoomId,'N2');await shot('arrival');
 assert((await gateLabels()).includes('SPLIT'));
 await move(96,132);await key();assert.equal((await state()).sceneProgress.classNetVaultDocketCarried,1);
 assert.equal((await westGate()).canOpen,false);
 assert((await gateLabels()).includes('FILE'));
 assert(!(await gateLabels()).includes('SPLIT'));
 await shot('return-locked');
 await move(80,150);await key();await shot('human-filed');assert.equal((await state()).sceneProgress.classNetVaultReviewStep,1);
 if(process.argv.includes('--wrong-desk')){
  const before=await state();
  // Observe the genuine action synchronously so an independent ego-bolt hit
  // during browser screenshots cannot be mistaken for a filing penalty.
  await page.evaluate(()=>{const scene=window.game.scene.getScene('NetworkScene'),route=scene.routeVaultDocket;scene.routeVaultDocket=function(...args){const before=JSON.parse(window.render_game_to_text()).reliability;const result=route.apply(this,args);window.qaFilingPenalty=before-JSON.parse(window.render_game_to_text()).reliability;scene.routeVaultDocket=route;return result;};});
  await key();
  assert.equal((await state()).sceneProgress.classNetVaultReviewStep,1);
  assert.equal((await state()).sceneProgress.classNetVaultDocketCarried,before.sceneProgress.classNetVaultDocketCarried);
  assert.equal(await page.evaluate(()=>window.qaFilingPenalty),2);
  assert.equal(await page.evaluate(()=>window.game.scene.getScene('NetworkScene').toast.text.text),'USE RELEASE STANDARD BOARD');
  await shot('wrong-desk-correction');
 }
 await move(96,96);await key();await shot('release-filed');assert.equal((await state()).sceneProgress.classNetVaultReviewStep,2);
 await move(164,96);await move(176,150);await key();await shot('ledger');
 console.log(JSON.stringify((await state()).choice));
 const ledger=async(key)=>{const target=page.locator(`.chronology-desk [data-focus-key=${key}]`);await target.scrollIntoViewIfNeeded();if(mobile)await target.tap();else await target.click();await page.waitForTimeout(150);};
 await ledger('file');await shot('missing-entry');
 assert(!(await state()).sceneProgress.classNetVaultReviewComplete);
 await ledger('later');await ledger('later');await shot('chronology-corrected');
 await ledger('file');await page.waitForTimeout(600);await shot('review-complete');
 if(process.argv.includes('--reward-art')){
  const art=await page.evaluate(()=>{const icon=window.game.scene.getScene('NetworkScene').clearanceTokenIcon;return {texture:icon.texture.key,width:icon.displayWidth,height:icon.displayHeight,sourceWidth:icon.texture.getSourceImage().width};});
  assert.equal(art.texture,'world-item-detail-v2-clearance-token');assert.equal(art.width,24);assert.equal(art.height,24);assert.equal(art.sourceWidth,144);
  await writeFile(`${out}/reward-art.json`,JSON.stringify(art,null,2));
 }
 assert.equal(await westGate(),undefined,'Finished review should remove the return restriction');
 assert((await gateLabels()).includes('SPLIT'),'Return sign should refresh without re-entering the room');
 assert(!(await gateLabels()).includes('FILE'));
 assert.equal((await state()).sceneProgress.classNetVaultReviewComplete,1);
 await move(164,132);await key();await shot('token');
 if(process.argv.includes('--reward-art')){
  const burst=await page.evaluate(()=>window.game.scene.getScene('NetworkScene').children.list.filter(o=>o.name==='snes-reward-burst').some(o=>o.list?.some(child=>child.texture?.key==='world-item-detail-v2-clearance-token')));
  assert(burst,'Pickup celebration must use the detailed icon too');
 }
 assert((await state()).inventory.includes('Clearance Token'));
 assert(!(await state()).sceneProgress.finalGatePublished,'A review token does not publish the volume');
 await move(216,132);await move(216,120);await key('ArrowRight',1200);
 await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).scene==='ReferralVaultScene');
 await page.waitForTimeout(700);await shot('referral-arrival');

 const arrived=await state();
 assert.equal(arrived.roomTraversal.currentRoomId,'R1');
 await page.reload();
 await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).scene==='TapToStartScene');await key('Enter');
 await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).scene==='ReferralVaultScene');
 await page.waitForTimeout(500);
 const restored=await state();
 assert.equal(restored.roomTraversal.currentRoomId,'R1');
 assert.equal(restored.sceneProgress.classNetVaultReviewComplete,1);
 assert(restored.inventory.includes('Clearance Token'));
 assert.equal(restored.documentPoints,arrived.documentPoints,'Reload must not award the review again');
 await shot('referral-restored');
 await key('ArrowDown',150);
 assert((await state()).player.y>restored.player.y,'Movement must resume after the handoff reload');

 await context.storageState({path:`${out}/earned-storage.json`});
 await writeFile(`${out}/result.json`,JSON.stringify({mobile,reviewFiled:true,missingEntryRejected:true,chronologyRepaired:true,tokenEarned:true,reviewNotPublication:true,referralEntered:true,reloadedWithoutDuplicateReward:true,errors},null,2));
 assert.deepEqual(errors,[]);console.log('PASS earned review batch, missing-entry rejection, chronology repair, Clearance Token, referral arrival and reload');
}finally{await shot('last');await browser.close();}
