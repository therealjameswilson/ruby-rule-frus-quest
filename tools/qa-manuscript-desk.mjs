import {completeRevisionDesk} from './revision-desk-actions.mjs';
import {completeChapterDesk} from './chapter-desk-actions.mjs';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const base=process.env.FRUS_QA_URL??'http://127.0.0.1:5219/';
const out=process.env.FRUS_QA_OUT??'/tmp/frus-manuscript-desk';await mkdir(out,{recursive:true});
const browser=await chromium.launch();const results=[];
try {
 const seed=await browser.newPage();await seed.goto(base+'?scene=PresidentialLibraryScene');await seed.waitForFunction(()=>localStorage.getItem('rubyRuleFrusQuestSave'));const template=await seed.evaluate(()=>JSON.parse(localStorage.getItem('rubyRuleFrusQuestSave')));await seed.close();
 for(const [name,width,height,touch] of [['desktop',1280,900,false],['phone',390,844,true],['landscape',844,390,true]]){
  const saved=structuredClone(template);saved.state.currentScene='ArchiveScene';saved.state.mode='explore';saved.state.activeDialog=null;saved.state.currentChoice=null;saved.state.processStamps=['rule'];saved.state.sceneProgress={compilerSopVersion:1,compilerSop_plan:1,compilerSop_research:1,archiveSourceRoomComplete:1,repositoryCoverageMapComplete:1};
  const p=await browser.newPage({viewport:{width,height},isMobile:touch,hasTouch:touch,storageState:{cookies:[],origins:[{origin:new URL(base).origin,localStorage:[{name:'rubyRuleFrusQuestSave',value:JSON.stringify(saved)}]}]}});const errors=[];p.on('pageerror',e=>errors.push(String(e)));
  await p.addInitScript(()=>{window.qaPad={connected:false,index:0,id:'QA desk controller',mapping:'standard',axes:[0,0],buttons:Array.from({length:16},()=>({pressed:false,value:0}))};Object.defineProperty(navigator,'getGamepads',{value:()=>window.qaPad.connected?[window.qaPad]:[]});});
  const state=()=>p.evaluate(()=>JSON.parse(window.render_game_to_text()));
  const pressPad=async(index)=>{await p.evaluate(i=>{window.qaPad.connected=true;window.qaPad.buttons[i]={pressed:true,value:1};},index);await p.waitForTimeout(110);await p.evaluate(i=>window.qaPad.buttons[i]={pressed:false,value:0},index);await p.waitForTimeout(110);};
  const click=async(selector)=>{const el=p.locator(selector);await el.scrollIntoViewIfNeeded();if(touch)await el.tap();else await el.click();await p.waitForTimeout(100);};
  const canvasTap=async(x,y)=>{const r=await p.locator('canvas').first().boundingBox();await p.mouse.click(r.x+x*r.width/256,r.y+y*r.height/240);};
  const drain=async()=>{for(let i=0;i<100;i++){if((await state()).mode!=='dialog')return;await p.keyboard.press('Space');await p.waitForTimeout(100);}assert.fail('dialogue stuck');};
  const enter=async()=>{await drain();await p.waitForTimeout(650);await p.evaluate(()=>window.game.scene.getScene('ArchiveScene').player.setPosition(248,120));await p.keyboard.down('ArrowRight');await p.waitForTimeout(150);await p.keyboard.up('ArrowRight');await p.waitForSelector('.manuscript-desk');await p.waitForTimeout(250);};
  await p.goto(base+'?text=full');await p.waitForFunction(()=>window.game?.scene.isActive('TapToStartScene'));await canvasTap(86,154);await p.waitForFunction(()=>window.game.scene.isActive('ArchiveScene'));await enter();
  for(const selector of ['.manuscript-budget','.manuscript-submit']) {const r=await p.locator(selector).boundingBox();assert(r.y>=0&&r.y+r.height<=height,`${name}: ${selector} outside viewport`);}
  if(touch){
    const body=p.locator('.manuscript-body');const r=await body.boundingBox();const cdp=await p.context().newCDPSession(p);const x=r.x+r.width/2,y=r.y+r.height-20;
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
    for(let i=1;i<=6;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-i*Math.min(25,r.height/10)}]});await p.waitForTimeout(30);}
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await p.waitForTimeout(200);assert(await body.evaluate(e=>e.scrollTop>0),'Finger swipe must scroll the packet area');await body.evaluate(e=>e.scrollTop=0);await cdp.detach();
  }
  await p.screenshot({path:`${out}/${name}-open.png`});
  assert.equal(await p.locator('.manuscript-record').count(),6);
  assert.equal(await p.locator('[data-coverage-id]').count(),3);
  assert.equal(await p.locator('[data-printed=true]').count(),0);
  assert((await p.locator('.manuscript-coverage').innerText()).includes('Exercise C · page 2'));
  const coverageBox=await p.locator('.manuscript-coverage').boundingBox();assert(coverageBox.width<=width);

  assert.equal(await p.locator('.manuscript-evidence-heading').first().textContent(),'Fictional sample excerpts');
  const before=(await state()).player;await p.keyboard.press('ArrowDown');await p.keyboard.press('ArrowUp');assert.deepEqual((await state()).player,before);
  await click('.manuscript-submit');assert((await p.locator('[data-status]').innerText()).includes('missing the decision'));
  await click('[data-packet=routine]');assert.equal((await state()).compilerMission.selectionDesk.pages,1280);assert.equal(await p.locator('[data-printed=true]').count(),0);await click('.manuscript-submit');assert((await p.locator('[data-status]').innerText()).includes('missing the decision'));
  await click('[data-packet=decision]');assert.equal((await state()).compilerMission.selectionDesk.pages,1500);assert.equal(await p.locator('[data-printed=true]').count(),3);await click('.manuscript-submit');assert((await p.locator('[data-status]').innerText()).includes('100 pages over'));assert.equal((await state()).compilerMission.completed,2);
  await p.screenshot({path:`${out}/${name}-over-budget.png`});
  await click('[data-packet=routine]');assert.equal((await state()).compilerMission.selectionDesk.pages,1320);
  await click('.manuscript-close');await p.waitForSelector('.manuscript-desk',{state:'detached'});assert.equal((await state()).compilerMission.completed,2);
  await p.reload();await p.waitForFunction(()=>window.game.scene.isActive('TapToStartScene'));await canvasTap(86,154);await p.waitForFunction(()=>window.game.scene.isActive('ArchiveScene'));await enter();assert.equal((await state()).compilerMission.selectionDesk.pages,1320);assert.equal(await p.locator('[data-packet=decision]').getAttribute('aria-pressed'),'true');
  if(name==='desktop'){
   // Real gamepad polling: toggle a selected packet off/on, then B to save/leave.
   await pressPad(0);assert.equal((await state()).compilerMission.selectionDesk.pages,1100);await pressPad(0);assert.equal((await state()).compilerMission.selectionDesk.pages,1320);await pressPad(1);await p.waitForSelector('.manuscript-desk',{state:'detached'});await enter();
   // Down reads a tall packet before leaving it. Right moves directly between
   // controls regardless of how many evidence lines the packet contains.
   await pressPad(13);assert(await p.locator('.manuscript-body').evaluate(e=>e.scrollTop>0));
   const coverageVisible=()=>p.evaluate(()=>{const card=document.querySelector('.manuscript-coverage').getBoundingClientRect(),body=document.querySelector('.manuscript-body').getBoundingClientRect();return card.top>=body.top-1&&card.bottom<=body.bottom+1;});
   for(let read=0;read<15&&!(await coverageVisible());read++)await pressPad(12);
   assert(await coverageVisible(),'Controller Up must reveal the packet coverage check');
   assert.equal(await p.locator('[data-packet=decision]').getAttribute('aria-pressed'),'true');
   await p.screenshot({path:`${out}/${name}-coverage-controller.png`});
   await pressPad(15);await pressPad(15);assert(await p.locator('.manuscript-submit').evaluate(e=>e===document.activeElement));await pressPad(0);
  }else{await p.screenshot({path:`${out}/${name}-ready.png`});await click('.manuscript-submit');}
  await p.waitForSelector('.manuscript-desk',{state:'detached'});assert.equal((await state()).compilerMission.completed,3);
  await drain();await completeChapterDesk(p,touch);assert.equal((await state()).compilerMission.completed,4);
  for(const value of ['retain','second','revise','clear','joint','handoff']){
   await drain();await p.waitForFunction(()=>window.game.scene.getScene('ArchiveScene').researchChoice.active);await p.waitForTimeout(220);
   if(value==='revise'){await completeRevisionDesk(p,touch);continue;}
   const point=await p.evaluate(value=>{const choice=window.game.scene.getScene('ArchiveScene').researchChoice;const i=choice.options.findIndex(o=>o.value===value);if(i<0)throw Error('Missing '+value);const r=choice.rows[i].getBounds();return{x:r.centerX,y:r.centerY};},value);await canvasTap(point.x,point.y);await p.waitForTimeout(100);
  }
  await drain();assert.equal((await state()).compilerMission.dpdSubmitted,true);assert.deepEqual(errors,[]);results.push({name,touch,invalidSelectionsRejected:true,draftRestored:true,keyboardAndController:name==='desktop',handoff:true,errors});await p.close();
 }
 await writeFile(out+'/result.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results));
}finally{await browser.close();}
