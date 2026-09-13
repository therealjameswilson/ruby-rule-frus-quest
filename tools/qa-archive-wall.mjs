const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
const mobile=process.argv.includes('--mobile');
const out=process.env.FRUS_QA_OUT??`/tmp/frus-archive-wall-${mobile?'mobile':'desktop'}`;
const base=process.env.FRUS_QA_URL??'http://127.0.0.1:5195/';
assert(process.env.FRUS_QA_STORAGE,'Set FRUS_QA_STORAGE to earned-storage.json from qa-guide-counter.mjs');
const storage=JSON.parse(await readFile(process.env.FRUS_QA_STORAGE,'utf8'));
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE}:{})});
const context=await browser.newContext({viewport:mobile?{width:375,height:667}:{width:1024,height:960},hasTouch:mobile,isMobile:mobile,deviceScaleFactor:mobile?3:1,storageState:storage});
const page=await context.newPage(),cdp=await context.newCDPSession(page),results=[],errors=[];
page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const state=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
async function point(x,y,id=1){const b=await page.locator('canvas').first().boundingBox();return{x:b.x+x*b.width/256,y:b.y+y*b.height/240,id};}
async function touch(x,y,dx=0,dy=0,ms=45){await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[await point(x,y)]});if(dx||dy)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[await point(x+dx,y+dy)]});await page.waitForTimeout(ms);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
async function click(x,y){if(mobile)await touch(x,y);else{const p=await point(x,y);await page.mouse.click(p.x,p.y,{delay:45});}await page.waitForTimeout(100);}
async function press(key='Space'){if(mobile)await touch(...(key==='x'?[174,216]:key==='m'?[224,16]:[225,205]));else await page.keyboard.press(key,{delay:45});await page.waitForTimeout(160);}
async function direction(key,ms=85){if(mobile){const[dx,dy]={ArrowLeft:[-26,0],ArrowRight:[26,0],ArrowUp:[0,-26],ArrowDown:[0,26]}[key];await touch(40,178,dx,dy,ms);}else{await page.keyboard.down(key);await page.waitForTimeout(ms);await page.keyboard.up(key);}await page.waitForTimeout(20);}
async function move(x,y,destination){
 let stalled=0;
 for(let n=0;n<150;n++){
  const s=await state();
  if(destination&&(s.scene===destination||s.roomTraversal?.currentRoomId===destination)){await page.waitForTimeout(600);return;}
  const dx=x-s.player.x,dy=y-s.player.y;
  if(!destination&&Math.hypot(dx,dy)<5)return;
  assert.equal(s.mode,'explore');
  const duration=Math.max(20,Math.min(85,Math.max(Math.abs(dx),Math.abs(dy))*7));
  await direction(Math.abs(dx)>Math.abs(dy)?dx>0?'ArrowRight':'ArrowLeft':dy>0?'ArrowDown':'ArrowUp',duration);
  const a=await state();
  stalled=Math.hypot(a.player.x-s.player.x,a.player.y-s.player.y)<1?stalled+1:0;
  if(stalled>10)throw Error(`Blocked ${JSON.stringify(a.player)} toward ${x},${y}; ${a.objective}`);
 }
 throw Error('Movement failed');
}
async function scene(key){await page.waitForFunction(key=>window.render_game_to_text&&JSON.parse(window.render_game_to_text()).scene===key,key);await page.waitForTimeout(750);}
async function shot(label){const s=await state();results.push({label,state:s});const img=await page.evaluate(()=>new Promise(resolve=>window.game.renderer.snapshot(i=>resolve(i.src))));await writeFile(`${out}/${label}-native.png`,Buffer.from(img.split(',')[1],'base64'));await page.screenshot({path:`${out}/${label}.png`});await context.storageState({path:`${out}/earned-storage.json`});console.log(label,JSON.stringify({scene:s.scene,mode:s.mode,player:s.player,objective:s.objective,reliability:s.reliability,points:s.documentPoints,held:s.heldItem,choice:s.choice}));return s;}
async function act(label){await press();return shot(label);}
async function choose(key){
 const before=await state();assert.equal(before.mode,'choice');
 if(mobile){const p=await page.evaluate(key=>{const c=window.game.scene.getScene('ArchiveScene').researchChoice;const i=c.options.findIndex(o=>o.key===key),r=c.optionObjects[i*2];return{x:r.x,y:r.y};},key);await click(p.x,p.y);}else await press(key==='A'?'Space':key==='C'?'c':'x');
 await page.waitForTimeout(250);
}
async function cancelReview(label){
 const before=await state();assert.equal(before.mode,'choice');
 const unchanged=async()=>{
  const after=await state();assert.equal(after.mode,'explore');
  assert.equal(after.documentPoints,before.documentPoints);
  for(const flag of ['archiveStandardsReviewComplete','archiveCoverageReviewComplete','repositoryCoverageMapComplete','annotationDraftingComplete'])assert.equal(after.sceneProgress[flag],before.sceneProgress[flag],flag);
  assert.deepEqual(after.processStamps,before.processStamps);
  assert.equal(after.playerCombat.weapon.swingId,before.playerCombat.weapon.swingId);
 };
 if(mobile)await click(224,16);else await press('Escape');
 await unchanged();await act(`${label}-reopened`);
 await choose('C');await unchanged();await act(`${label}-after-back`);
 assert.equal((await state()).mode,'choice');
}
try{
 await page.goto(new URL('?text=full',base).href);await scene('TapToStartScene');if(mobile)await click(86,154);else await press('Enter');await scene('ArchiveScene');await shot('00-earned-archive');
 let points=43;
 if(!process.argv.includes('--cart-only')) {
 await act('01-source-note');
 if(process.argv.includes('--route-lifetime')){
  const counts=()=>page.evaluate(()=>{const s=window.game.scene.getScene('ArchiveScene');return {tracked:s.roomObjects.length,retired:s.roomObjects.filter(o=>!o.active).length,route:s.sourceNoteRouteCueObjects.length};});
  const before=await counts();
  await move(56,184);await move(56,100);await move(56,184);
  await move(188,184);await move(188,100);await move(188,184);
  const after=await counts();
  await shot('01-carried-route-lifetime');
  await writeFile(`${out}/route-lifetime.json`,JSON.stringify({before,after},null,2));
  assert(after.retired<=before.retired+5,'Moving source trail must not retain destroyed markers in room cleanup');
  assert(after.tracked<=before.tracked+10,'Guidance marker ownership must stay bounded while walking');
 }
 await move(128,158);await act('02-research-table');
 await move(80,158);await move(80,72);await move(128,72);await direction('ArrowUp',650);
 const locked=await shot('02-stacks-locked');assert.equal(locked.roomTraversal.currentRoomId,'A1');assert(!locked.sceneProgress.archiveRepoWallCleared);assert.equal(locked.documentPoints,22);
 await move(80,72);await move(80,176);
 await move(100,176);await move(100,168);await direction('ArrowUp',60);await press('x');await page.waitForTimeout(450);
 const early=await shot('02-unreviewed-swing');assert(!early.sceneProgress.archiveRepoWallCleared);assert.equal(early.documentPoints,22);
 const freeOrder=process.argv.includes('--free-order');
 if(freeOrder){
  await move(188,168);await move(188,154);const first=await act('03-folder-first');
  assert.equal(first.sceneProgress.sourceNoteProvenanceMask,4);assert.equal(first.documentPoints,22);assert.equal(first.mode,'explore');
  await act('03-folder-repeat');assert.equal((await state()).sceneProgress.sourceNoteProvenanceStep,1);
  await context.storageState({path:`${out}/partial-source-trail-storage.json`});
  await page.reload();await scene('TapToStartScene');if(mobile)await click(86,154);else await press('Enter');await scene('ArchiveScene');
  const resumed=await shot('03-folder-continue');assert.equal(resumed.sceneProgress.sourceNoteProvenanceMask,4);assert.equal(resumed.sceneProgress.sourceNoteProvenanceStep,1);
  assert(!resumed.sceneProgress.sourceNoteProvenanceComplete);assert(!resumed.sceneProgress.aboutSeriesFirstFootnoteComplete);
  await move(56,154);await act('04-collection');await move(56,100);await act('05-repository-last');
 }else{
  await move(56,158);await move(56,100);await act('03-repository');
  await move(56,148);await act('04-collection');await move(188,154);await act('05-folder');
 }
 const gathered=await shot('05-trail-gathered');assert.equal(gathered.sceneProgress.sourceNoteProvenanceMask,7);
 assert.equal(gathered.mode,'explore');assert.equal(gathered.documentPoints,22);
 assert(!gathered.sceneProgress.sourceNoteProvenanceComplete);assert(!gathered.sceneProgress.archiveRepoWallCleared);
 await move(freeOrder?80:188,145);await move(128,145);await act('05-first-footnote');
 const note=()=>state().then(s=>s.documentCandidates.find(d=>d.id==='source_note_047'));
 assert.equal((await note()).repository,'');
 await context.storageState({path:`${out}/source-note-review-storage.json`});
 if(mobile)await click(77,158);else{await press('ArrowDown');await press();}
 const refused=await shot('05-unsupported-filing');assert.equal(refused.mode,'choice');assert.equal(refused.documentPoints,22);assert(!refused.sceneProgress.aboutSeriesFirstFootnoteComplete);
 if(mobile)await click(128,123);else{await press('ArrowUp');await press();}
 if(mobile)await click(128,123);else{await press('ArrowUp');await press();}
 const repaired=await shot('05-repaired-unfiled');assert.equal(repaired.sceneProgress.sourceNote47ReadershipCorrected,1);assert.equal(repaired.documentPoints,22);assert.equal((await note()).repository,'');
 if(mobile)await click(190,158);else await press('x');
 const canceled=await state();assert.equal(canceled.mode,'explore');
 await page.reload();await scene('TapToStartScene');if(mobile)await click(86,154);else await press('Enter');await scene('ArchiveScene');
 assert.deepEqual((await state()).player,canceled.player);assert.equal((await state()).sceneProgress.sourceNote47ReadershipCorrected,1);assert.equal((await note()).repository,'');
 await act('05-partial-continue');
 if(mobile)await click(77,158);else await press();
 const filed=await shot('06-footnote-approved');assert.equal(filed.documentPoints,28);
 assert.equal((await note()).repository,'Fictional National Archives Collection');assert.equal((await note()).folder,'Alliance Consultation');assert.equal((await note()).firstFootnote.readership,null);
 await move(128,145);await act('07-standards-review');await cancelReview('07-standards');await choose('A');await shot('08-source-stamped');
 await move(100,176);await move(100,168);await direction('ArrowUp',60);assert.equal((await state()).playerFacing,'north');await shot('09-before-swing');
 await context.storageState({path:`${out}/reviewed-wall.json`});
 if(process.argv.includes('--interact'))await direction('ArrowDown',45);
 await press(process.argv.includes('--interact')?'Space':'x');await page.waitForTimeout(450);const swung=await shot('09-after-swing');
 assert.equal(swung.sceneProgress.archiveRepoWallCleared,1,'Equipped Citation Stamp swing must clear the reviewed wall');
 points=swung.documentPoints;assert.equal(points,43);
 await press('x');await page.waitForTimeout(450);assert.equal((await state()).documentPoints,points,'Repeated swings must not duplicate rewards');
 await page.reload();await scene('TapToStartScene');if(mobile)await click(86,154);else await press('Enter');await scene('ArchiveScene');
 const resumed=await shot('09-cleared-wall-continue');assert.equal(resumed.sceneProgress.archiveRepoWallCleared,1);assert.equal(resumed.documentPoints,points);
 await page.waitForTimeout(1600);await shot('10-annotation-route');
 await move(80,164);await move(80,72);await move(128,72);await act('10-enter-stacks');await page.waitForTimeout(850);
 assert.equal((await state()).roomTraversal.currentRoomId,'AS');await shot('10-stacks-entry');
 await move(208,190);await move(208,98);await act('11-selectivity');
 const partial=await state();assert.equal(partial.sceneProgress.annotationGatheredMask,4);assert.equal(partial.documentPoints,points);
 await context.storageState({path:`${out}/partial-stacks-storage.json`});
 await press('m');const paused=await state();assert.equal(paused.mode,'pause');await page.waitForTimeout(650);assert.deepEqual((await state()).player,paused.player);await shot('11-stacks-paused');await press('m');
 await page.reload();await scene('TapToStartScene');if(mobile)await click(86,154);else await press('Enter');await scene('ArchiveScene');
 const continued=await shot('11-stacks-continue');assert.equal(continued.roomTraversal.currentRoomId,'AS');assert.deepEqual(continued.player,partial.player);assert.equal(continued.heldItem,partial.heldItem);
 } else {
  const resumed=await state();
  assert.equal(resumed.roomTraversal.currentRoomId,'AS');
  assert.equal(resumed.sceneProgress.annotationGatheredMask,4);
  assert.equal(resumed.sceneProgress.annotationCartY??160,160);
  assert(!resumed.sceneProgress.annotationCartParked);
  points=resumed.documentPoints;
 }
 await move(208,190);await move(128,192);await direction('ArrowUp',400);
 const contact=await shot('12-cart-collision');assert(contact.player.y>=169,'Feet must stop below the cart');
 assert.equal(contact.sceneProgress.annotationGatheredMask,4);assert.equal(contact.documentPoints,points);
 assert.equal(contact.sceneProgress.annotationCartY??160,160,'A brief bump must not push');
 if(process.argv.includes('--hold-cart')) {
   await direction('ArrowUp',450);await shot('12-cart-held-north');
 } else await act('12-cart-north');
 assert.equal((await state()).sceneProgress.annotationCartY,144);
 await move(108,176);await move(108,144);await act('12-cart-east');
 assert.equal((await state()).sceneProgress.annotationCartX,144);
 await context.storageState({path:`${out}/partial-cart-storage.json`});
 const partialCart=await state();
 await page.reload();await scene('TapToStartScene');if(mobile)await click(86,154);else await press('Enter');await scene('ArchiveScene');
 const cartContinued=await shot('12-cart-continue');assert.deepEqual(cartContinued.player,partialCart.player);
 assert.equal(cartContinued.sceneProgress.annotationCartX,144);assert.equal(cartContinued.sceneProgress.annotationCartY,144);
 assert.equal(cartContinued.sceneProgress.annotationGatheredMask,4);assert.equal(cartContinued.documentPoints,points);
 await move(108,176);await move(144,176);await move(144,164);await act('12-cart-north-again');
 await move(144,148);await act('12-cart-parked');
 assert.equal((await state()).sceneProgress.annotationCartParked,1);assert.equal((await state()).sceneProgress.annotationGatheredMask,4);
 assert.equal((await state()).documentPoints,points);
 await move(144,132);await act('12-context');assert.equal((await state()).sceneProgress.annotationGatheredMask,6);
 await move(112,132);await move(112,76);await move(128,76);
 await direction('ArrowUp',750);await page.waitForTimeout(500);assert.equal((await state()).roomTraversal.currentRoomId,'AS');assert(!(await state()).sceneProgress.annotationDraftingComplete);
 await move(128,76);await move(48,76);await act('13-source');
 assert.equal((await state()).sceneProgress.annotationGatheredMask,7);assert.equal((await state()).documentPoints,points);
 await move(48,190);await move(128,192);await move(128,220,'A1');
 const returned=await shot('13-returned-packet');assert.equal(returned.heldItem,'Annotation packet 3/3');assert(!returned.sceneProgress.annotationDraftingComplete);assert.notEqual(returned.nearestInteractable,'ENTER NOTE STACKS');
 await move(80,72);await move(80,145);await move(128,145);await act('14-file-packet');await cancelReview('14-coverage');await choose('B');await shot('15-annotation-filed');
 await context.storageState({path:`${out}/filed-packet-storage.json`});
 await move(68,144);await act('16-telegram');await move(188,144);await act('17-crossref');
 await move(216,144);await move(216,120);await move(248,120,'NetworkScene');await shot('18-network-entry');
 assert.equal((await state()).scene,'NetworkScene');assert.deepEqual(errors,[]);console.log('PASS Archive critical path');
}catch(error){console.error(error);process.exitCode=1;await shot('failure').catch(()=>{});results.push({failure:String(error)});}
finally{try{await writeFile(`${out}/results.json`,JSON.stringify({results,errors},null,2));}finally{await browser.close();}}
