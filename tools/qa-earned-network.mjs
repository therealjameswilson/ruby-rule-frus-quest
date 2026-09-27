import { completeCompilerCheckpoint } from './qa-compiler-checkpoint-helper.mjs';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
assert(process.env.FRUS_QA_STORAGE, 'Provide an earned filed-annotation checkpoint');
const out=process.env.FRUS_QA_OUT ?? '/private/tmp/frus-earned-network';await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE});
const mobile=process.argv.includes('--mobile');
const context=await browser.newContext({storageState:process.env.FRUS_QA_STORAGE,...(mobile?{viewport:{width:390,height:844},hasTouch:true,isMobile:true}:{})});
const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e)));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
const state=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
const eastGate = async () => (await state()).roomGraph.find(room => room.id === 'A1').lockedExitState.east;
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
const key=async(key='Space')=>{
 if(!mobile)await page.keyboard.press(key,{delay:50});
 else if(key.startsWith('Arrow'))await hold(key,50);
 else if((await state()).scene==='TapToStartScene')await tap(86,154);
 else if(await page.locator('#portrait-touch-dock').isVisible())await page.locator('#portrait-touch-dock [data-control="space"]').tap();
 else await tap(225,205);
 await page.waitForTimeout(200);
};
async function move(x,y){for(let i=0;i<100;i++){const p=(await state()).player,dx=x-p.x,dy=y-p.y;if(Math.abs(dx)<4&&Math.abs(dy)<4)return;const horizontal=Math.abs(dx)>=4;const k=horizontal?dx>0?'ArrowRight':'ArrowLeft':dy>0?'ArrowDown':'ArrowUp';await hold(k,Math.min(80,Math.max(12,Math.abs(horizontal?dx:dy)*5)));await page.waitForTimeout(30);}throw Error(`Cannot walk to ${x},${y}`);}
try{
 await page.goto(new URL('?text=full',process.env.FRUS_QA_URL??'http://127.0.0.1:5195/').href);
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
 await move(216,142);await move(216,120);await hold('ArrowRight',1500);await page.waitForTimeout(200);
 if(mobile){
  await page.waitForSelector('.manuscript-desk');
  assert.equal((await state()).compilerMission.selectionDesk.pages,1100,'Releasing the movement thumb must not select a packet');
  const tapElement=async selector=>{const e=page.locator(selector);await e.scrollIntoViewIfNeeded();await e.tap();await page.waitForTimeout(120);};
  await tapElement('[data-packet=routine]');await tapElement('.manuscript-submit');
  assert((await page.locator('[data-status]').innerText()).includes('missing the decision'));
  await tapElement('[data-packet=decision]');await tapElement('.manuscript-submit');
  assert((await page.locator('[data-status]').innerText()).includes('100 pages over'));await shot('selection-over-budget');
  await tapElement('[data-packet=routine]');assert.equal((await state()).compilerMission.selectionDesk.pages,1320);
  await tapElement('.manuscript-close');await hold('ArrowRight',200);await page.waitForSelector('.manuscript-desk');
  assert.equal((await state()).compilerMission.selectionDesk.pages,1320);await shot('selection-restored');
 }
 await completeCompilerCheckpoint(page,mobile);
 if((await state()).scene==='ArchiveScene')await hold('ArrowRight',1000);
 await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).scene==='NetworkScene');
 await page.waitForTimeout(800);await shot('network');

 await context.storageState({path:`${out}/earned-storage.json`});
 await writeFile(`${out}/result.json`,JSON.stringify({mobile,earnedSupportingDocuments:true,manuscriptHandoff:(await state()).compilerMission,networkReached:true,errors},null,2));
 assert.deepEqual(errors,[]);console.log('PASS earned supporting documents and east network route');
}finally{await shot('last');await browser.close();}
