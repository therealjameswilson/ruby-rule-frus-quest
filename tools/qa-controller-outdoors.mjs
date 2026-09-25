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
 // Enter Reagan from the rail arrival and earn its entire research packet.
 await button(0);await p.waitForFunction(()=>window.game.scene.isActive('PresidentialLibraryScene'));
 const drain=async()=>{for(let i=0;i<60&&(await state()).mode==='dialog';i++)await button(0);assert.equal((await state()).mode,'explore');};
 await drain();const pointsBefore=(await state()).documentPoints;
 await move(48,186);await p.waitForFunction(()=>window.game.scene.getScene('UIScene').questBandCueText.text==='NW: FINDING AID');
 await p.screenshot({path:`${out}/${mobile?'phone':'desktop'}-locked-guidance.png`});await button(0);await drain();assert.equal((await state()).sceneProgress.libraryResearch_reagan??0,0);
 await move(128,186);
 await move(128,130);await move(48,130);await move(48,118);
 await button(0);assert.equal((await state()).mode,'choice');await button(13);await button(0);await drain();assert.equal((await state()).sceneProgress.libraryResearch_reagan??0,0,'Wrong answer must not file a station');
 for(let station=0;station<4;station++){
  if(station===1){await move(128,118);await move(202,118);}
  if(station===2){await move(128,118);await move(128,186);await move(202,186);}
  if(station===3)await move(48,186);
  await button(0);assert.equal((await state()).mode,'choice');if(station%2)await button(13);await button(0);
  assert.equal(await p.evaluate(()=>JSON.parse(window.render_game_to_text()).audioStatus),'paper filing and stamp');
  if(station<3){assert.equal((await state()).mode,'explore','Intermediate filing must not block walking');const clear=await p.evaluate(()=>{const s=window.game.scene.getScene('PresidentialLibraryScene'),a=s.toast.container.getBounds(),b=s.player.sprite.getBounds();return !s.toast.visible||a.bottom<b.top||a.top>b.bottom;});assert(clear,'Filing feedback must not cover the hero');}
  await drain();assert.equal((await state()).sceneProgress.libraryResearch_reagan,station+1);
  const receipts=await p.evaluate(()=>window.game.scene.getScene('PresidentialLibraryScene').receipts.map(r=>r.visible));assert.deepEqual(receipts,[0,1,2,3].map(i=>i<=station));
 }
 assert.equal((await state()).documentPoints,pointsBefore+8);
 await p.waitForFunction(()=>{const ui=window.game.scene.getScene('UIScene');return ui.questBandCueText.text==='REVIEW SAVED STEP'&&ui.questBandText.text==='PACKET FILED';});
 await p.screenshot({path:`${out}/${mobile?'phone':'desktop'}-packet-filed.png`});
 await move(128,186);await move(128,200);await button(13,240);await p.waitForFunction(()=>window.game.scene.isActive('ResearchWorldScene'));await p.waitForTimeout(350);
 assert.equal((await state()).sceneProgress.libraryResearch_reagan,4);const saved=await p.evaluate(()=>JSON.parse(localStorage.getItem('rubyRuleFrusQuestSave')));assert.equal(saved.state.sceneProgress.libraryResearch_reagan,4);
 await button(9);assert((await state()).pauseMenu,'Start opens menu');await button(9);assert.equal((await state()).pauseMenu,null);
 // Disconnect while a direction is held; stale controller input must not persist.
 await p.evaluate(()=>window.qaPad.buttons[14].pressed=true);await p.waitForTimeout(150);await p.evaluate(()=>window.qaPad.connected=false);await p.waitForTimeout(150);const stopped=(await state()).player;await p.waitForTimeout(200);assert.deepEqual((await state()).player,stopped);
 if(mobile){
  const dock=p.locator('#portrait-touch-dock');await dock.waitFor({state:'visible'});
  const pad=await dock.locator('[data-control=pad]').boundingBox();assert(pad);
  const cdp=await p.context().newCDPSession(p);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:pad.x+pad.width*.85,y:pad.y+pad.height*.5,id:1}]});
  await p.waitForTimeout(160);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 }else{await p.keyboard.down('ArrowRight');await p.waitForTimeout(160);await p.keyboard.up('ArrowRight');}

 await p.waitForTimeout(100);assert((await state()).player.x>stopped.x+3,'Input handoff moves hero');
 const released=(await state()).player;await p.waitForTimeout(180);assert.deepEqual((await state()).player,released,'Release stops handoff movement');
 await p.screenshot({path:`${out}/${mobile?'phone':'desktop'}.png`});assert.deepEqual(errors,[]);await writeFile(`${out}/${mobile?'phone':'desktop'}.json`,JSON.stringify({controllerSalad:true,controllerRail:true,libraryStations:4,visibleFiledPapers:true,nonBlockingIntermediateFiling:true,filingSound:true,lockedStationRedirect:true,wrongAnswerRecovered:true,libraryReward:8,libraryReturn:true,savedPacket:true,startMenu:true,disconnectStops:true,handoff:true,releaseStops:true,naturalControllerMovement:true,errors},null,2));console.log('PASS',mobile?'phone':'desktop');await p.close();
}}finally{await browser.close();}
