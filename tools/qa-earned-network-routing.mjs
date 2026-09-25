const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
assert(process.env.FRUS_QA_STORAGE,'Provide an earned Network checkpoint');
const mobile=process.argv.includes('--mobile');
const out=process.env.FRUS_QA_OUT ?? '/private/tmp/frus-network-crossing-earned';await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE});
const context=await browser.newContext({storageState:process.env.FRUS_QA_STORAGE,viewport:mobile?{width:375,height:667}:{width:1024,height:960},hasTouch:mobile,isMobile:mobile,deviceScaleFactor:mobile?3:1});
const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e)));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
const state=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
const eastGate = async () => (await state()).roomGraph.find(room => room.id === 'N1').lockedExitState.east;
const cdp=mobile?await context.newCDPSession(page):null;
const key=async(k='Space',ms=50)=>{
 if(mobile){
  const box=await page.locator('canvas').first().boundingBox();
  const point=(x,y)=>({x:box.x+x*box.width/256,y:box.y+y*box.height/240,id:1});
  const dirs={ArrowLeft:[-26,0],ArrowRight:[26,0],ArrowUp:[0,-26],ArrowDown:[0,26]};
  const origin=dirs[k]?[48, 202]:k==='Enter'?[86,154]:k==='x'?[174,216]:[225,205];
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point(...origin)]});
  if(dirs[k])await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[point(origin[0]+dirs[k][0],origin[1]+dirs[k][1])]});
  await page.waitForTimeout(ms);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 }else{await page.keyboard.down(k);await page.waitForTimeout(ms);await page.keyboard.up(k);}
 await page.waitForTimeout(150);
};
const shot=async name=>{const data=await page.evaluate(()=>new Promise(r=>window.game.renderer.snapshot(i=>r(i.src))));await writeFile(`${out}/${name}.png`,Buffer.from(data.split(',')[1],'base64'));await writeFile(`${out}/${name}.json`,JSON.stringify(await state(),null,2));if(mobile)await page.screenshot({path:`${out}/${name}-phone.png`});};
async function move(x,y){const tolerance=mobile?5:3;for(let i=0;i<100;i++){const p=(await state()).player,dx=x-p.x,dy=y-p.y;if(Math.abs(dx)<tolerance&&Math.abs(dy)<tolerance)return;const h=Math.abs(dx)>=tolerance;await key(h?dx>0?'ArrowRight':'ArrowLeft':dy>0?'ArrowDown':'ArrowUp',Math.min(100,Math.max(mobile?50:20,Math.abs(h?dx:dy)/72*1000)));}throw Error(`Cannot walk to ${x},${y}`);}
try{
 await page.goto(new URL('?text=full',process.env.FRUS_QA_URL ?? 'http://127.0.0.1:5195/').href);
 await page.waitForFunction(()=>window.render_game_to_text&&JSON.parse(window.render_game_to_text()).scene==='TapToStartScene');await key('Enter');
 await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).scene==='NetworkScene');await page.waitForTimeout(1000);


 await page.waitForTimeout(3000);
 assert.equal((await state()).scene,'NetworkScene','Reading a continued doorway save must not return to Archive');
 await move(96,124);
 await page.waitForFunction(()=>window.game.scene.getScene('UIScene').questBandCueText.text==='FILE PUBLIC PACKET FIRST');
 assert.equal(await page.evaluate(()=>window.game.scene.getScene('UIScene').questBandVerbText.text),'!');
 await shot('arrival');
 assert.equal((await eastGate()).canOpen,false);
 await move(96,178);await key();await shot('public-carried');
 assert.equal((await state()).sceneProgress.networkRoutingCarried,1);
 await move(96,140);await key();await shot('public-filed');
 assert.equal((await state()).sceneProgress.networkRoutingStep,1);
 // Approach above the OpenNet packet-filing radius so the seal owns the cue.
 await move(96,108);await key('ArrowRight',100);
 await page.waitForFunction(()=>window.game.scene.getScene('UIScene').questBandCueText.text==='STAMP THE SEAL');
 assert.equal(await page.evaluate(()=>window.game.scene.getScene('UIScene').questBandVerbText.text),mobile?'B':'X');
 await shot('crossing-ready');
 await key('x');await page.waitForTimeout(600);await shot('crossing');
 assert.equal((await state()).sceneProgress.networkStampCrossingOpen,1);
 await move(96,124);await key();
 assert.equal((await state()).sceneProgress.networkRoutingStep,2);
 if(process.argv.includes('--wrong-route')){
  const before=await state();
  await key();
  assert.equal((await state()).sceneProgress.networkRoutingStep,2);
  assert.equal((await state()).sceneProgress.networkRoutingCarried,before.sceneProgress.networkRoutingCarried);
  assert.equal((await state()).reliability,before.reliability-2);
  assert.equal(await page.evaluate(()=>window.game.scene.getScene('NetworkScene').toast.text.text),'ROUTE TO CLASSNET');
  await shot('wrong-network-correction');
 }
 await move(164,124);await key();
 assert.equal((await state()).sceneProgress.networkRoutingStep,3);
 assert.equal((await eastGate()).canOpen,false,'All four packets must be filed before the map opens the vault');
 await key();await page.waitForTimeout(600);
 assert.equal((await state()).sceneProgress.networkRoutingComplete,1);await shot('routing-complete');
 assert.equal((await eastGate()).canOpen,true,'Completed routing must open the map gate as well as the physical vault door');
 await move(216,124);await key('ArrowRight',1200);
 await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).roomTraversal.currentRoomId==='N2');
 await page.waitForTimeout(700);await shot('vault-arrival');
 await page.reload();
 await page.waitForFunction(()=>window.render_game_to_text&&JSON.parse(window.render_game_to_text()).scene==='TapToStartScene');await key('Enter');
 await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).scene==='NetworkScene');await page.waitForTimeout(800);
 assert.equal((await state()).roomTraversal.currentRoomId,'N2');
 const restoredX=(await state()).player.x;
 await key('ArrowRight',100);
 assert((await state()).player.x>restoredX);
 await shot('vault-restored');

 await context.storageState({path:`${out}/earned-storage.json`});
 assert.deepEqual(errors,[]);console.log('PASS four earned routing deliveries, Citation Stamp crossing and ClassNet Vault arrival');
}finally{await shot('last');await browser.close();}
