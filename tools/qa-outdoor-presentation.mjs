import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const base=process.env.FRUS_QA_URL ?? 'http://127.0.0.1:5173/';
const out=process.env.FRUS_QA_OUT ?? '/tmp/outdoor-presentation';await mkdir(out,{recursive:true});
const browser=await chromium.launch({args:['--disable-audio-output']});const results=[];
try{for(const [name,width,height,touch] of [['desktop',1280,720,false],['phone',390,844,true],['landscape',844,390,true]]){
 const p=await browser.newPage({viewport:{width,height},hasTouch:touch,isMobile:touch,deviceScaleFactor:touch?3:1});const errors=[];p.on('pageerror',e=>errors.push(String(e)));
 await p.goto(new URL('?scene=ResearchWorldScene&text=full',base).href);await p.waitForFunction(()=>window.game?.scene.isActive('ResearchWorldScene'));await p.waitForTimeout(450);
 const state=()=>p.evaluate(()=>JSON.parse(window.render_game_to_text()));
 const tap=async(x,y)=>{const r=await p.locator('canvas').first().boundingBox();if(touch)await p.touchscreen.tap(r.x+x*r.width/256,r.y+y*r.height/240);else await p.mouse.click(r.x+x*r.width/256,r.y+y*r.height/240);await p.waitForTimeout(180);};
 const control=async(key,x,y)=>{const button=p.locator(`#portrait-touch-dock [data-control=${key}]`);if(await button.isVisible()){const r=await button.boundingBox();await p.touchscreen.tap(r.x+r.width/2,r.y+r.height/2);await p.waitForTimeout(180);}else await tap(x,y);};
 const act=async()=>{if(touch)await control('space',225,205);else{await p.keyboard.press('Space',{delay:40});await p.waitForTimeout(180);}};
 // Bounded presentation fixtures; actual A/B/dialog and travel-menu input follows.
 const position=async(x,y)=>{await p.evaluate(({x,y})=>window.game.scene.getScene('ResearchWorldScene').player.setPosition(x,y),{x,y});await p.waitForTimeout(100);};
 await p.screenshot({path:`${out}/${name}-entry.png`});
 await position(91,199);await act();assert.equal((await state()).sceneProgress.researchJamesWarningHeard,1);
 await p.screenshot({path:`${out}/${name}-james.png`});
 for(let i=0;i<20&&(await state()).mode==='dialog';i++)await act();assert.equal((await state()).mode,'explore');
 await position(130,153);const before=await p.evaluate(()=>window.game.scene.getScene('ResearchWorldScene').disguise);
 if(touch)await control('b',174,216);else await p.keyboard.press('x',{delay:40});
 await p.waitForFunction(before=>window.game.scene.getScene('ResearchWorldScene').disguise!==before,before);
 const prompt=await p.evaluate(()=>{const s=window.game.scene.getScene('ResearchWorldScene');return {duplicateBanner:!!s.children.getByName('research-action-prompt'),text:window.game.scene.getScene('UIScene').questBandCueText.text};});
 assert.equal(prompt.duplicateBanner,false);assert(prompt.text.includes('NEXT DISGUISE'));
 await p.screenshot({path:`${out}/${name}-danne.png`});
 await position(128,210);await act();assert.equal((await state()).mode,'choice');await tap(232,36);assert.equal((await state()).mode,'explore');
 for(let zone=0;zone<7;zone++){
  await p.evaluate(zone=>window.game.scene.getScene('ResearchWorldScene').travel(zone),zone);
  await p.waitForFunction(zone=>window.game.scene.getScene('ResearchWorldScene').zone===zone&&window.game.scene.isActive('ResearchWorldScene'),zone);await p.waitForTimeout(250);
  const bounds=await p.evaluate(()=>{const s=window.game.scene.getScene('ResearchWorldScene');const title=s.children.getByName('research-region-title').getBounds(),count=s.tally.getBounds();return {title:{right:title.right},count:{x:count.x,right:count.right}};});
  assert(bounds.title.right<bounds.count.x,'Region title and tally do not overlap');assert(bounds.count.right<=241);
  await p.screenshot({path:`${out}/${name}-zone-${zone}.png`});
  if(zone===0||zone===5){await position(zone===0?64:192,134);await p.waitForTimeout(150);const cue=await p.evaluate(()=>window.game.scene.getScene('UIScene').questBandCueText.text);assert(cue.includes(zone===0?'COLLECTIONS':'ENTER LIBRARY'));assert(cue.includes(zone===0?'SOURCES':'ABOUT'));}

 }
 assert.deepEqual(errors,[]);results.push({name,prompt,errors,checks:['James dialogue','DANN-E change disguise','rail open and close','seven region title layouts']});await p.close();
}await writeFile(`${out}/results.json`,JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));}finally{await browser.close();}
