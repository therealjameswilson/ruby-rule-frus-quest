import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const out=process.env.FRUS_QA_OUT??'/tmp/referral-floor';await mkdir(out,{recursive:true});
const browser=await chromium.launch({args:['--disable-audio-output']});
try{
 const p=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true,storageState:'/tmp/frus-campaign-current-1c8c477/07-earned-clearance/earned-storage.json'});
 const errors=[];p.on('pageerror',e=>errors.push(String(e)));
 await p.goto('http://127.0.0.1:5211/?text=full');await p.waitForFunction(()=>window.game?.scene.isActive('TapToStartScene'));
 const b=await p.locator('canvas').first().boundingBox();await p.touchscreen.tap(b.x+86*b.width/256,b.y+154*b.height/240);
 await p.waitForFunction(()=>window.game.scene.isActive('ReferralVaultScene'));await p.waitForTimeout(1800);
 // Room fixtures validate rendering and cleanup, not earned progression.
 for(const room of ['R1','R2','R3','R1']){
  const state=await p.evaluate(room=>{const s=window.game.scene.getScene('ReferralVaultScene');s.currentRoomId=room;s.redrawReferralRoom({x:32,y:174});const floors=s.children.list.filter(o=>o.name==='referral-detailed-floor');const f=floors[0];return {count:floors.length,key:f.texture.key,width:f.displayWidth,height:f.displayHeight,depth:f.depth,tracked:s.roomObjects.includes(f),solids:s.roomSolids.length};},room);
  assert.equal(state.count,1);assert.equal(state.key,`referral-floor-${room}-v1`);assert.equal(state.depth,-12);assert.equal(state.width,256);assert.equal(state.height,208);assert(state.tracked&&state.solids>0);
  if(room==='R3')assert.equal(await p.evaluate(()=>window.game.scene.getScene('ReferralVaultScene').children.list.filter(o=>o.name==='dispatch-detailed-shelves').length),1);
  await p.waitForTimeout(200);await p.screenshot({path:`${out}/${room}-phone.png`});console.log(JSON.stringify({room,...state}));
 }
 assert.deepEqual(errors,[]);console.log('PASS referral room rendering and cleanup; zero page errors');
}finally{await browser.close();}
