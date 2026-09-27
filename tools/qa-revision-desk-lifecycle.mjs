import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const base=process.env.FRUS_QA_URL??'http://127.0.0.1:5219/';const out=process.env.FRUS_QA_OUT??'/tmp/frus-revision-lifecycle';await mkdir(out,{recursive:true});
// Use software audio rendering: a headless host without an output device can stall AudioContext time.
const browser=await chromium.launch({args:['--disable-audio-output']});const results=[];
try{
 const seed=await browser.newPage();await seed.goto(base+'?scene=PresidentialLibraryScene');await seed.waitForFunction(()=>localStorage.getItem('rubyRuleFrusQuestSave'));const template=await seed.evaluate(()=>JSON.parse(localStorage.getItem('rubyRuleFrusQuestSave')));await seed.close();
 for(const [name,width,height,touch] of [['lifecycle',1280,900,false]]){
  const saved=structuredClone(template);saved.state.currentScene='ArchiveScene';saved.state.mode='explore';saved.state.activeDialog=null;saved.state.currentChoice=null;saved.state.processStamps=['rule'];saved.state.sceneProgress={compilerSopVersion:1,compilerSop_plan:1,compilerSop_research:1,compilerSop_selection:1,compilerSopDocumentPages:1320,compilerSop_backup:1,compilerSop_first_review:1,compilerSop_second_review:1,compilerRevisionRead:3,compilerRevisionSource:2,compilerRevisionLine:2,archiveSourceRoomComplete:1,repositoryCoverageMapComplete:1};
  const p=await browser.newPage({viewport:{width,height},isMobile:touch,hasTouch:touch,storageState:{cookies:[],origins:[{origin:new URL(base).origin,localStorage:[{name:'rubyRuleFrusQuestSave',value:JSON.stringify(saved)}]}]}});const errors=[];p.on('pageerror',e=>errors.push(String(e)));
  await p.addInitScript(()=>{window.qaPad={connected:false,index:0,id:'QA revision controller',mapping:'standard',axes:[0,0],buttons:Array.from({length:16},()=>({pressed:false,value:0}))};Object.defineProperty(navigator,'getGamepads',{value:()=>window.qaPad.connected?[window.qaPad]:[]});});
  const state=()=>p.evaluate(()=>JSON.parse(window.render_game_to_text()));const desk=async()=>(await state()).compilerMission.revisionDesk;
  const click=async(selector)=>{const e=p.locator(selector);await e.scrollIntoViewIfNeeded();if(touch)await e.tap();else await e.click();await p.waitForTimeout(100);};
  const pad=async(index)=>{await p.evaluate(i=>{window.qaPad.connected=true;window.qaPad.buttons[i]={pressed:true,value:1};},index);await p.waitForTimeout(100);await p.evaluate(i=>window.qaPad.buttons[i]={pressed:false,value:0},index);await p.waitForTimeout(100);};
  const tap=async(x,y)=>{const r=await p.locator('canvas').first().boundingBox();await p.mouse.click(r.x+x*r.width/256,r.y+y*r.height/240);};
  const drain=async()=>{for(let i=0;i<90;i++){if((await state()).mode!=='dialog')return;await p.keyboard.press('Space');await p.waitForTimeout(100);}assert.fail('dialogue stuck');};
  const enter=async()=>{await drain();await p.waitForTimeout(650);await p.evaluate(()=>window.game.scene.getScene('ArchiveScene').player.setPosition(248,120));await p.keyboard.down('ArrowRight');await p.waitForTimeout(150);await p.keyboard.up('ArrowRight');await p.waitForSelector('.revision-desk');await p.waitForTimeout(250);};
  const reload=async()=>{await click('.revision-desk .manuscript-close');await p.reload();await p.waitForFunction(()=>window.game.scene.isActive('TapToStartScene'));await tap(86,154);await p.waitForFunction(()=>window.game.scene.isActive('ArchiveScene'));await enter();};
  await p.goto(base+'?text=full');await p.waitForFunction(()=>window.game?.scene.isActive('TapToStartScene'));await tap(86,154);await p.waitForFunction(()=>window.game.scene.isActive('ArchiveScene'));await enter();
  const mix=async active=>{try{await p.waitForFunction(active=>{const a=window.rubyRuleAudioDebug();return a.readingMixActive===active&&a.musicGainValue!==null&&Math.abs(a.musicGainValue-(active ? .36 : .8))<.02;},active);results.push({reading:active,...await p.evaluate(()=>window.rubyRuleAudioDebug())});}catch(e){console.error('Mix state:',await p.evaluate(()=>window.rubyRuleAudioDebug()));throw e;}};
  await mix(true);
  await p.locator('[data-line="1"]').focus();
  await p.keyboard.press('f');await p.waitForTimeout(700);assert(await p.evaluate(()=>Boolean(document.fullscreenElement)));
  await mix(true);assert(await p.locator('[data-line="1"]').evaluate(e=>e===document.activeElement));await p.screenshot({path:out+'/revision-fullscreen.png'});
  await p.keyboard.press('ArrowUp');await p.keyboard.press('Space');assert.equal((await desk()).highlightedLine,0);
  await click('[data-source="1"]');assert.equal((await desk()).highlightedLine,null);
  await p.keyboard.press('Tab');assert(await p.locator('[data-source="2"]').evaluate(e=>e===document.activeElement));await p.keyboard.press('Enter');assert.equal((await desk()).source,2);
  await p.locator('[data-line="0"]').focus();await pad(15);await pad(0);assert.equal((await desk()).highlightedLine,1);
  await click('[data-apply]');await click('[data-backup]');assert((await p.locator('.revision-proposed span').innerText()).includes('CORRECTION APPLIED'));await p.screenshot({path:out+'/revision-applied-fullscreen.png'});
  await pad(1);await p.waitForSelector('.revision-desk',{state:'detached'});await mix(false);assert.equal(await p.evaluate(()=>document.body.style.touchAction),'');
  await enter();await p.evaluate(()=>window.game.scene.getScene('ArchiveScene').scene.start('OfficeScene'));await p.waitForFunction(()=>window.game.scene.isActive('OfficeScene'));assert.equal(await p.locator('.revision-desk').count(),0);await mix(false);assert.equal(await p.evaluate(()=>document.body.style.touchAction),'');
  assert.deepEqual(errors,[]);console.log('Revision fullscreen, dynamic focus, keyboard, gamepad, cancellation, scene cleanup and reading audio mix passed');await p.close();
 }
 await writeFile(out+'/reading-mix.json',JSON.stringify({checks:results},null,2));
}finally{await browser.close();}
