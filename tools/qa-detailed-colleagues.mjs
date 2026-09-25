import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const out='/tmp/detailed-colleagues';await mkdir(out,{recursive:true});const browser=await chromium.launch();
try{for(const [scene,id,storage] of [
 ['NetworkScene','marcus','/tmp/frus-campaign-current-1c8c477/05-earned-network/earned-storage.json'],
 ['ReferralVaultScene','marcus','/tmp/frus-campaign-current-1c8c477/07-earned-clearance/earned-storage.json'],
 ['SilentReadScene','priya','/tmp/referral-manifest-cached-gesture/earned-storage.json']]){
 const p=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true,storageState:storage});const errors=[];p.on('pageerror',e=>errors.push(String(e)));
 const tap=async(x,y)=>{const b=await p.locator('canvas').first().boundingBox();await p.touchscreen.tap(b.x+x*b.width/256,b.y+y*b.height/240);};
 await p.goto('http://127.0.0.1:5211/?text=full');await p.waitForFunction(()=>window.game?.scene.isActive('TapToStartScene'));await tap(86,154);await p.waitForFunction(s=>window.game.scene.isActive(s),scene);await p.waitForTimeout(1600);
 const npc=await p.evaluate(({scene,id})=>{const s=window.game.scene.getScene(scene),n=s.children.list.find(o=>o.name===`historian-${id}`);return {key:n.texture.key,x:n.x,y:n.y,width:n.displayWidth,height:n.displayHeight,depth:n.depth,originY:n.originY};},{scene,id});
 assert.equal(npc.key,`npc-${id}-detailed-v1`);assert.equal(npc.width,32);assert.equal(npc.height,48);assert.equal(npc.depth,npc.y);
 const sole=id==='priya'?1447/1536:1467/1536;assert(Math.abs((sole-npc.originY)*48-5)<.01);
 await p.screenshot({path:`${out}/${scene}.png`});
 // Position fixture isolates the unchanged NPC interaction anchor; touch A is real.
 await p.evaluate(({scene,x,y})=>window.game.scene.getScene(scene).player.setPosition(x+12,y+5),{scene,x:npc.x,y:npc.y});await p.waitForTimeout(150);
 const before=await p.evaluate(()=>JSON.parse(window.render_game_to_text()));assert.match(before.nearestInteractable??'',new RegExp(id,'i'));
 await tap(225,205);await p.waitForTimeout(250);const after=await p.evaluate(()=>JSON.parse(window.render_game_to_text()));
 assert(after.dialog||after.latestMessage!==before.latestMessage,'Guide must respond to A');
 await p.screenshot({path:`${out}/${scene}-guide.png`});assert.deepEqual(errors,[]);console.log(JSON.stringify({scene,npc,guideResponded:true,errors}));await p.close();
}}finally{await browser.close();}
