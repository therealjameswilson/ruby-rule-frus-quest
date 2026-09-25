import assert from 'node:assert/strict';
import {mkdir,readFile} from 'node:fs/promises';
const campaign=process.env.FRUS_QA_CAMPAIGN??'/tmp/frus-campaign-current-1c8c477';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');await mkdir('/tmp/network-floor',{recursive:true});const browser=await chromium.launch({args:['--disable-audio-output']});
try{for(const [room,stage] of [['N1','05-earned-network'],['N2','06-earned-network-routing']]){
 const storage=JSON.parse(await readFile(`${campaign}/${stage}/earned-storage.json`,'utf8'));
 const p=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true,storageState:storage});const errors=[];p.on('pageerror',e=>errors.push(String(e)));
 await p.goto('http://127.0.0.1:5211/?text=full');await p.waitForFunction(()=>window.game?.scene.isActive('TapToStartScene'));
 const b=await p.locator('canvas').first().boundingBox();await p.touchscreen.tap(b.x+86*b.width/256,b.y+154*b.height/240);
 await p.waitForFunction(()=>window.game.scene.isActive('NetworkScene'));await p.waitForTimeout(2000);
 const state=await p.evaluate(()=>{const s=window.game.scene.getScene('NetworkScene');const floors=s.children.list.filter(o=>o.name==='network-detailed-floor');return {room:s.currentRoomId,count:floors.length,key:floors[0].texture.key,width:floors[0].displayWidth,height:floors[0].displayHeight,depth:floors[0].depth,tracked:s.roomObjects.includes(floors[0]),solids:s.roomSolids.length};});
 assert.equal(state.room,room);assert.equal(state.count,1);assert.equal(state.width,256);assert.equal(state.height,208);assert.equal(state.depth,-12);assert(state.tracked&&state.solids>0);assert(state.key.includes(room==='N1'?'split':'vault'));
 await p.screenshot({path:`/tmp/network-floor/${room}-phone.png`});assert.deepEqual(errors,[]);console.log(JSON.stringify({...state,errors}));await p.close();
}}finally{await browser.close();}
