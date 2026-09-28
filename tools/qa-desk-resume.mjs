import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const base=process.env.FRUS_QA_URL??'http://127.0.0.1:5219/';
const out=process.env.FRUS_QA_OUT??'/tmp/frus-desk-resume';await mkdir(out,{recursive:true});
const browser=await chromium.launch();const results=[];
try {
 const seed=await browser.newPage();await seed.goto(base+'?scene=PresidentialLibraryScene');await seed.waitForFunction(()=>localStorage.getItem('rubyRuleFrusQuestSave'));const template=await seed.evaluate(()=>JSON.parse(localStorage.getItem('rubyRuleFrusQuestSave')));await seed.close();
 for(const [name,width,height,touch] of [['desktop',1280,900,false],['phone',390,844,true]]){
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
  await click('[data-packet=decision]');
  const before=await state();
  const deskBefore=await p.evaluate(()=>({focus:document.activeElement?.dataset.focusKey,scroll:document.querySelector('.manuscript-body').scrollTop}));
  const background=async()=>{await p.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});await p.waitForTimeout(150);};
  for(const input of ['pointer','keyboard','controller']) {
    if(input==='controller'){await p.evaluate(()=>window.qaPad.connected=true);await p.waitForTimeout(100);}
    await background();
    assert(await p.evaluate(()=>document.querySelector('#tap-resume-overlay').open));
    assert(await p.evaluate(()=>!!document.elementFromPoint(innerWidth/2,innerHeight/2)?.closest('#tap-resume-overlay')),'Resume must be above native research dialogs');
    await p.screenshot({path:out+`/${name}-${input}-shield.png`});
    if(input==='pointer') {if(touch)await p.locator('#tap-resume-overlay button').tap();else await p.locator('#tap-resume-overlay button').click();}
    else if(input==='keyboard')await p.keyboard.press('Space');
    else await pressPad(0);
    await p.waitForTimeout(250);
    assert(await p.locator('#tap-resume-overlay').isHidden());
    assert.equal((await state()).compilerMission.selectionDesk.pages,before.compilerMission.selectionDesk.pages,'Resume must not toggle selection');
    assert.deepEqual(await p.evaluate(()=>({focus:document.activeElement?.dataset.focusKey,scroll:document.querySelector('.manuscript-body').scrollTop})),deskBefore);
  }
  // Native controls remain operable after their prior focus is restored.
  await p.keyboard.press('Enter');assert.equal((await state()).compilerMission.selectionDesk.pages,1100);
  await p.keyboard.press('Enter');assert.equal((await state()).compilerMission.selectionDesk.pages,1320);
  await p.screenshot({path:out+`/${name}-restored.png`});
  await pressPad(1);await p.waitForSelector('.manuscript-desk',{state:'detached'});
  assert.deepEqual(errors,[]);results.push({name,topmost:true,selectionPreserved:true,focusAndScrollRestored:true,inputs:['pointer','keyboard','controller'],errors});await p.close();
 }
 await writeFile(out+'/result.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results));
}finally{await browser.close();}
