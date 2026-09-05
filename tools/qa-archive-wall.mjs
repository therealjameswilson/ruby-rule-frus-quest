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
async function move(x,y,destination){let stalled=0;for(let n=0;n<150;n++){const s=await state();if(destination&&(s.scene===destination||s.roomTraversal?.currentRoomId===destination)){await page.waitForTimeout(600);return;}const dx=x-s.player.x,dy=y-s.player.y;if(!destination&&Math.hypot(dx,dy)<5)return;assert.equal(s.mode,'explore');await direction(Math.abs(dx)>Math.abs(dy)?dx>0?'ArrowRight':'ArrowLeft':dy>0?'ArrowDown':'ArrowUp');const a=await state();stalled=Math.hypot(a.player.x-s.player.x,a.player.y-s.player.y)<1?stalled+1:0;if(stalled>10)throw Error(`Blocked ${JSON.stringify(a.player)} toward ${x},${y}; ${a.objective}`);}throw Error('Movement failed');}
async function scene(key){await page.waitForFunction(key=>window.render_game_to_text&&JSON.parse(window.render_game_to_text()).scene===key,key);await page.waitForTimeout(750);}
async function shot(label){const s=await state();results.push({label,state:s});const img=await page.evaluate(()=>new Promise(resolve=>window.game.renderer.snapshot(i=>resolve(i.src))));await writeFile(`${out}/${label}-native.png`,Buffer.from(img.split(',')[1],'base64'));await page.screenshot({path:`${out}/${label}.png`});await context.storageState({path:`${out}/earned-storage.json`});console.log(label,JSON.stringify({scene:s.scene,mode:s.mode,player:s.player,objective:s.objective,reliability:s.reliability,points:s.documentPoints,held:s.heldItem,choice:s.choice}));return s;}
async function act(label){await press();return shot(label);}
async function choose(key){
 const before=await state();assert.equal(before.mode,'choice');
 if(mobile){const p=await page.evaluate(key=>{const c=window.game.scene.getScene('ArchiveScene').researchChoice;const i=c.options.findIndex(o=>o.key===key),r=c.optionObjects[i*2];return{x:r.x,y:r.y};},key);await click(p.x,p.y);}else await press(key==='A'?'Space':'x');
 await page.waitForTimeout(250);
}
try{
 await page.goto(new URL('?text=full',base).href);await scene('TapToStartScene');if(mobile)await click(86,154);else await press('Enter');await scene('ArchiveScene');await shot('00-earned-archive');
 await act('01-source-note');await move(128,158);await act('02-research-table');
 await move(100,176);await move(100,168);await direction('ArrowUp',60);await press('x');await page.waitForTimeout(450);
 const early=await shot('02-unreviewed-swing');assert(!early.sceneProgress.archiveRepoWallCleared);assert.equal(early.documentPoints,22);
 await move(56,158);await move(56,100);await act('03-repository');
 await move(56,148);await act('04-collection');await move(188,154);await act('05-first-footnote');
 await choose('A');await shot('06-footnote-approved');
 await move(128,145);await act('07-standards-review');await choose('A');await shot('08-source-stamped');
 await move(100,176);await move(100,168);await direction('ArrowUp',60);assert.equal((await state()).playerFacing,'north');await shot('09-before-swing');
 await context.storageState({path:`${out}/reviewed-wall.json`});
 if(process.argv.includes('--interact'))await direction('ArrowDown',45);
 await press(process.argv.includes('--interact')?'Space':'x');await page.waitForTimeout(450);const swung=await shot('09-after-swing');
 assert.equal(swung.sceneProgress.archiveRepoWallCleared,1,'Equipped Citation Stamp swing must clear the reviewed wall');
 const points=swung.documentPoints;assert.equal(points,43);
 await press('x');await page.waitForTimeout(450);assert.equal((await state()).documentPoints,points,'Repeated swings must not duplicate rewards');
 await page.reload();await scene('TapToStartScene');if(mobile)await click(86,154);else await press('Enter');await scene('ArchiveScene');
 const resumed=await shot('09-cleared-wall-continue');assert.equal(resumed.sceneProgress.archiveRepoWallCleared,1);assert.equal(resumed.documentPoints,points);
 await page.waitForTimeout(1600);await shot('10-annotation-route');
 await move(188,154);await act('11-selectivity');await move(56,148);await act('12-context');await move(56,100);await act('13-source');
 await move(56,148);await move(128,145);await act('14-file-packet');await choose('B');await shot('15-annotation-filed');
 await move(68,144);await act('16-telegram');await move(188,144);await act('17-crossref');
 await move(216,144);await move(216,120);await move(248,120,'NetworkScene');await shot('18-network-entry');
 assert.equal((await state()).scene,'NetworkScene');assert.deepEqual(errors,[]);console.log('PASS Archive critical path');
}catch(error){console.error(error);process.exitCode=1;await shot('failure').catch(()=>{});results.push({failure:String(error)});}
finally{try{await writeFile(`${out}/results.json`,JSON.stringify({results,errors},null,2));}finally{await browser.close();}}
