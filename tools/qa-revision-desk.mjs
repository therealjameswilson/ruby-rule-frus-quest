import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const base=process.env.FRUS_QA_URL??'http://127.0.0.1:5219/';const out=process.env.FRUS_QA_OUT??'/tmp/frus-revision-desk';await mkdir(out,{recursive:true});
const browser=await chromium.launch();const results=[];
try{
 const seed=await browser.newPage();await seed.goto(base+'?scene=PresidentialLibraryScene');await seed.waitForFunction(()=>localStorage.getItem('rubyRuleFrusQuestSave'));const template=await seed.evaluate(()=>JSON.parse(localStorage.getItem('rubyRuleFrusQuestSave')));await seed.close();
 for(const [name,width,height,touch] of [['desktop',1280,900,false],['phone',390,844,true],['landscape',844,390,true]]){
  const saved=structuredClone(template);saved.state.currentScene='ArchiveScene';saved.state.mode='explore';saved.state.activeDialog=null;saved.state.currentChoice=null;saved.state.processStamps=['rule'];saved.state.sceneProgress={compilerSopVersion:1,compilerSop_plan:1,compilerSop_research:1,compilerSop_selection:1,compilerSop_backup:1,compilerSop_first_review:1,compilerSop_second_review:1,archiveSourceRoomComplete:1,repositoryCoverageMapComplete:1};
  const p=await browser.newPage({viewport:{width,height},isMobile:touch,hasTouch:touch,storageState:{cookies:[],origins:[{origin:new URL(base).origin,localStorage:[{name:'rubyRuleFrusQuestSave',value:JSON.stringify(saved)}]}]}});const errors=[];p.on('pageerror',e=>errors.push(String(e)));
  await p.addInitScript(()=>{window.qaPad={connected:false,index:0,id:'QA revision controller',mapping:'standard',axes:[0,0],buttons:Array.from({length:16},()=>({pressed:false,value:0}))};Object.defineProperty(navigator,'getGamepads',{value:()=>window.qaPad.connected?[window.qaPad]:[]});});
  const state=()=>p.evaluate(()=>JSON.parse(window.render_game_to_text()));const desk=async()=>(await state()).compilerMission.revisionDesk;
  const click=async(selector)=>{const e=p.locator('.revision-desk '+selector);await e.scrollIntoViewIfNeeded();if(touch)await e.tap();else await e.click();await p.waitForTimeout(100);};
  const pad=async(index)=>{await p.evaluate(i=>{window.qaPad.connected=true;window.qaPad.buttons[i]={pressed:true,value:1};},index);await p.waitForTimeout(100);await p.evaluate(i=>window.qaPad.buttons[i]={pressed:false,value:0},index);await p.waitForTimeout(100);};
  const tap=async(x,y)=>{const r=await p.locator('canvas').first().boundingBox();await p.mouse.click(r.x+x*r.width/256,r.y+y*r.height/240);};
  const drain=async()=>{for(let i=0;i<90;i++){if((await state()).mode!=='dialog')return;await p.keyboard.press('Space');await p.waitForTimeout(100);}assert.fail('dialogue stuck');};
  const enter=async()=>{await drain();await p.waitForTimeout(650);await p.evaluate(()=>window.game.scene.getScene('ArchiveScene').player.setPosition(248,120));await p.keyboard.down('ArrowRight');await p.waitForTimeout(150);await p.keyboard.up('ArrowRight');await p.waitForSelector('.revision-desk');await p.waitForTimeout(250);};
  const reload=async()=>{await click('.manuscript-close');await p.reload();await p.waitForFunction(()=>window.game.scene.isActive('TapToStartScene'));await tap(86,154);await p.waitForFunction(()=>window.game.scene.isActive('ArchiveScene'));await enter();};
  await p.goto(base+'?text=full');await p.waitForFunction(()=>window.game?.scene.isActive('TapToStartScene'));await tap(86,154);await p.waitForFunction(()=>window.game.scene.isActive('ArchiveScene'));await enter();
  const original=(await desk()).originalReviewCopy;const player=(await state()).player;await p.keyboard.press('ArrowRight');await p.keyboard.press('ArrowLeft');assert.deepEqual((await state()).player,player);
  await click('[data-apply]');assert.equal((await desk()).applied,false);await click('[data-comment=coverage]');await click('[data-comment=support]');await p.locator('.manuscript-body').evaluate(e=>e.scrollTop=0);await p.screenshot({path:`${out}/${name}-comments.png`});
  await click('[data-source="3"]');await click('[data-line="0"]');await click('[data-apply]');assert.equal((await desk()).applied,false);
  await click('[data-source="2"]');assert.equal((await desk()).highlightedLine,null);await click('[data-line="0"]');await click('[data-apply]');assert.equal((await desk()).applied,false);
  await click('[data-line="1"]');await reload();assert.equal((await desk()).highlightedLine,1);assert((await desk()).comments.every(c=>c.read));
  await click('[data-apply]');assert.equal((await desk()).applied,true);await click('.manuscript-submit');assert.equal((await state()).compilerMission.completed,6);assert((await p.locator('[data-status]').innerText()).includes('backup'));
  await click('[data-backup]');await reload();assert.equal((await desk()).applied,true);assert.equal((await desk()).backupAttached,true);
  await click('[data-source="1"]');assert.equal((await desk()).applied,false);await click('.manuscript-submit');assert.equal((await state()).compilerMission.completed,6);
  await click('[data-source="2"]');await click('[data-line="1"]');await click('[data-apply]');assert.equal((await desk()).originalReviewCopy,original);
  if(name==='desktop'){
   await p.locator('[data-backup]').focus();await pad(0);assert.equal((await desk()).backupAttached,false);await pad(0);assert.equal((await desk()).backupAttached,true);await pad(1);await p.waitForSelector('.revision-desk',{state:'detached'});await enter();
   await p.locator('[data-apply]').focus();await p.keyboard.press('Enter');assert.equal((await desk()).applied,false);await p.keyboard.press('Enter');assert.equal((await desk()).applied,true);
  }
  await p.locator('[data-apply]').scrollIntoViewIfNeeded();await p.screenshot({path:`${out}/${name}-revision.png`});
  const r=await p.locator('.manuscript-submit').boundingBox();assert(r.y>=0&&r.y+r.height<=height,'submit remains visible');
  await click('.manuscript-submit');await p.waitForSelector('.revision-desk',{state:'detached'});assert.equal((await state()).compilerMission.completed,7);assert.equal((await state()).compilerMission.dpdSubmitted,false);
  await drain();assert((await state()).choice.title.includes('front matter'));assert.deepEqual(errors,[]);
  results.push({name,wrongEvidenceRejected:true,originalPreserved:true,reload:true,evidenceChangeInvalidates:true,keyboardAndController:name==='desktop',frontMatterReached:true,errors});await p.close();
 }
 await writeFile(out+'/result.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results));
}finally{await browser.close();}
