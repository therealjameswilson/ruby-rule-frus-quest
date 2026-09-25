import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const out=process.env.FRUS_QA_OUT??'/tmp/controller-outdoors';await mkdir(out,{recursive:true});
const browser=await chromium.launch({args:['--disable-audio-output']});
try{for(const mobile of [false,true]){
 const p=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1280,height:720},hasTouch:mobile,isMobile:mobile});const errors=[];p.on('pageerror',e=>errors.push(String(e)));
 await p.addInitScript(()=>{window.qaPad={connected:true,index:0,id:'QA standard controller',mapping:'standard',axes:[0,0],buttons:Array.from({length:16},()=>({pressed:false,value:0}))};Object.defineProperty(navigator,'getGamepads',{value:()=>window.qaPad.connected?[window.qaPad]:[]});});
 await p.goto(new URL('?scene=ResearchWorldScene&text=full',process.env.FRUS_QA_URL??'http://127.0.0.1:5211/').href);await p.waitForFunction(()=>window.game?.scene.isActive('ResearchWorldScene'));await p.waitForTimeout(500);
 const state=()=>p.evaluate(()=>JSON.parse(window.render_game_to_text()));
 const button=async(i,ms=80)=>{await p.evaluate(i=>window.qaPad.buttons[i].pressed=true,i);await p.waitForTimeout(ms);await p.evaluate(i=>window.qaPad.buttons[i].pressed=false,i);await p.waitForTimeout(240);};
 const move=async(x,y)=>{for(let i=0;i<80;i++){const pos=(await state()).player,dx=x-pos.x,dy=y-pos.y;if(Math.hypot(dx,dy)<3)return;const horizontal=Math.abs(dx)>Math.abs(dy);await button(horizontal?(dx>0?15:14):(dy>0?13:12),Math.max(20,Math.min(90,Math.max(Math.abs(dx),Math.abs(dy))*7)));}throw Error('Unreachable controller target');};
 // Travel the ordinary walkable route from spawn; no player/state injection.
 await move(64,183);await button(0);assert.equal((await state()).mode,'choice');
 await button(1);assert.equal((await state()).mode,'explore');assert.equal((await state()).sceneProgress.sweetgreenSaladsOrdered,undefined);
 await button(0);await button(13);await button(0);assert.equal((await state()).sceneProgress.sweetgreenLastSalad,2);
 for(let i=0;i<15&&(await state()).mode==='dialog';i++)await button(0);assert.equal((await state()).mode,'explore');
 await move(128,210);await button(0);assert.equal((await state()).mode,'choice');await button(1);assert.equal((await state()).mode,'explore');
 await button(0);await button(13);await button(13);await button(0);await p.waitForTimeout(600);
 assert.equal(await p.evaluate(()=>window.game.scene.getScene('ResearchWorldScene').zone),5,'Controller reaches Reagan region through rail');
 await button(9);assert((await state()).pauseMenu,'Start opens menu');await button(9);assert.equal((await state()).pauseMenu,null);
 // Disconnect while a direction is held; stale controller input must not persist.
 await p.evaluate(()=>window.qaPad.buttons[14].pressed=true);await p.waitForTimeout(150);await p.evaluate(()=>window.qaPad.connected=false);await p.waitForTimeout(150);const stopped=(await state()).player;await p.waitForTimeout(200);assert.deepEqual((await state()).player,stopped);
 if(mobile){assert.equal(await p.evaluate(()=>window.game.scene.getScene('UIScene').controls.buttons[0].text.visible),true);const r=await p.locator('canvas').first().boundingBox();const cdp=await p.context().newCDPSession(p);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:r.x+70*r.width/256,y:r.y+204*r.height/240,id:1}]});await p.waitForTimeout(160);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}else{await p.keyboard.down('ArrowRight');await p.waitForTimeout(160);await p.keyboard.up('ArrowRight');}
 await p.waitForTimeout(100);assert((await state()).player.x>stopped.x+3,'Input handoff moves hero');
 await p.screenshot({path:`${out}/${mobile?'phone':'desktop'}.png`});assert.deepEqual(errors,[]);await writeFile(`${out}/${mobile?'phone':'desktop'}.json`,JSON.stringify({controllerSalad:true,controllerRail:true,startMenu:true,disconnectStops:true,handoff:true,errors},null,2));console.log('PASS',mobile?'phone':'desktop');await p.close();
}}finally{await browser.close();}
