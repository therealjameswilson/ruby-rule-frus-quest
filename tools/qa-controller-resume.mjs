import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const out=process.env.FRUS_QA_OUT??'/tmp/frus-controller-resume';await mkdir(out,{recursive:true});
const browser=await chromium.launch();
try {
 const p=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),errors=[];
 p.on('pageerror',e=>errors.push(String(e)));
 await p.addInitScript(()=>{
   window.qaPad={id:'QA controller',index:0,connected:true,mapping:'standard',axes:[0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};
   Object.defineProperty(navigator,'getGamepads',{value:()=>[window.qaPad]});
 });
 await p.goto(new URL('?scene=ResearchWorldScene',process.env.FRUS_QA_URL??'http://127.0.0.1:5217/').href);
 await p.waitForFunction(()=>window.game?.scene.isActive('ResearchWorldScene'));
 const button=async(index,pressed)=>{await p.evaluate(({index,pressed})=>window.qaPad.buttons[index]={pressed,value:Number(pressed)},{index,pressed});await p.waitForTimeout(120);};
 const hidden=async(value)=>{await p.evaluate(value=>{Object.defineProperty(document,'hidden',{configurable:true,value});document.dispatchEvent(new Event('visibilitychange'));},value);await p.waitForTimeout(120);};
 const shield=()=>p.locator('#tap-resume-overlay').isVisible();
 const state=()=>p.evaluate(()=>JSON.parse(window.render_game_to_text()));
 const rows=[];
 for(const mode of ['explore','dialog']) {
   if(mode==='dialog')await p.evaluate(()=>window.game.scene.getScene('ResearchWorldScene').dialog.show('ARCHIVIST',['Keep the source citation.','Record the original classification.']));
   const before=await state();
   await hidden(true);await button(0,true);await hidden(false);
   assert(await shield(),'Held A on returning must not dismiss the shield');
   await p.screenshot({path:out+`/${mode}-shield.png`});
   await button(0,false);await button(0,true);
   assert(!(await shield()),'Fresh A resumes with no pointer or keyboard');
   await p.waitForTimeout(250);
   const after=await state();
   assert.equal(after.mode,before.mode);assert.deepEqual(after.player,before.player);assert.deepEqual(after.dialog,before.dialog);
   await button(0,false);
   if(mode==='dialog') {await button(0,true);await button(0,false);assert.notDeepEqual((await state()).dialog,before.dialog);await p.evaluate(()=>window.game.scene.getScene('ResearchWorldScene').dialog.hide());}
   rows.push({mode,heldIgnored:true,resumed:true,taskPreserved:true});
 }
 await hidden(true);await hidden(false);await hidden(true);await button(9,true);await hidden(false);assert(await shield(),'A second background cycle must rearm the held-button guard');await button(9,false);await button(9,true);assert(!(await shield()));await p.waitForTimeout(250);assert.equal((await state()).mode,'explore');await button(9,false);
 // Movement works after the resume action is released.
 const before=(await state()).player;await p.evaluate(()=>window.qaPad.axes=[1,0]);await p.waitForTimeout(200);await p.evaluate(()=>window.qaPad.axes=[0,0]);assert((await state()).player.x>before.x);
 // Existing touch and keyboard paths still dismiss the shield.
 for(const input of ['touch','keyboard']) {await hidden(true);await hidden(false);if(input==='touch')await p.locator('#tap-resume-overlay').tap();else await p.keyboard.press('Space');assert(!(await shield()));assert.equal((await state()).mode,'explore');rows.push({input,resumed:true});}
 assert.deepEqual(errors,[]);await p.screenshot({path:out+'/resumed.png'});await writeFile(out+'/result.json',JSON.stringify({scope:'Simulated controller and browser visibility; not physical hardware.',rows,startDidNotOpenMenu:true,movement:true,errors},null,2));console.log('PASS controller resume, held guard, dialogue preservation, movement, touch and keyboard');
} finally {await browser.close();}
