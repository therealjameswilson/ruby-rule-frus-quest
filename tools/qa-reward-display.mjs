import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');const out='/tmp/reward-display';await mkdir(out,{recursive:true});const browser=await chromium.launch();
try{
 const p=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true,storageState:'/tmp/frus-campaign-current-1c8c477/07-earned-clearance/earned-storage.json'});const errors=[];p.on('pageerror',e=>errors.push(String(e)));
 await p.goto('http://127.0.0.1:5211/?text=full');await p.waitForFunction(()=>window.game?.scene.isActive('TapToStartScene'));const b=await p.locator('canvas').first().boundingBox();await p.touchscreen.tap(b.x+86*b.width/256,b.y+154*b.height/240);await p.waitForFunction(()=>window.game.scene.isActive('ReferralVaultScene'));await p.waitForTimeout(1600);
 // Presentation fixtures only: progression is tested separately by the earned route.
 for(const collected of [false,true,false]){
  const result=await p.evaluate(collected=>{const s=window.game.scene.getScene('ReferralVaultScene');s.currentRoomId='R2';s.concurrenceSlipCollected=collected;s.redrawReferralRoom({x:64,y:170});const objects=s.children.list,cases=objects.filter(o=>o.name==='snes-treasure-case'),art=cases[0];return {cases:cases.length,key:art.texture.key,width:art.displayWidth,height:art.displayHeight,tracked:s.roomObjects.includes(art),caption:objects.find(o=>o.name==='snes-treasure-label').text,visiblePickup:objects.filter(o=>/^snes-treasure-(icon|spark)/.test(o.name)&&o.visible).length};},collected);
  assert.equal(result.cases,1);assert(result.key.startsWith('reward-display-pedestal-'));assert.equal(result.width,64);assert.equal(result.height,44);assert(result.tracked);assert.equal(result.visiblePickup,collected?0:9);assert.equal(result.caption,collected?'FILED':'CONCURRENCE SLIP');await p.waitForTimeout(150);await p.screenshot({path:`${out}/${collected?'collected':'available'}-phone.png`});console.log(JSON.stringify({collected,...result}));
 }
 assert.deepEqual(errors,[]);console.log('PASS reward display states and redraw cleanup; no page errors');
}finally{await browser.close();}
