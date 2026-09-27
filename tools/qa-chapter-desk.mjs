import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const base=process.env.FRUS_QA_URL??'http://127.0.0.1:5219/';const out=process.env.FRUS_QA_OUT??'/tmp/frus-chapter-desk';await mkdir(out,{recursive:true});
const browser=await chromium.launch();const results=[];
try{
 const seed=await browser.newPage();await seed.goto(base+'?scene=PresidentialLibraryScene');await seed.waitForFunction(()=>localStorage.getItem('rubyRuleFrusQuestSave'));const template=await seed.evaluate(()=>JSON.parse(localStorage.getItem('rubyRuleFrusQuestSave')));await seed.close();
 for(const [name,width,height,touch] of [['desktop',1280,900,false],['phone',390,844,true],['landscape',844,390,true]]){
  const saved=structuredClone(template);saved.state.currentScene='ArchiveScene';saved.state.mode='explore';saved.state.activeDialog=null;saved.state.currentChoice=null;saved.state.processStamps=['rule'];saved.state.sceneProgress={compilerSopVersion:1,compilerSop_plan:1,compilerSop_research:1,compilerSop_selection:1,compilerSopDocumentPages:1320,archiveSourceRoomComplete:1,repositoryCoverageMapComplete:1};
  const p=await browser.newPage({viewport:{width,height},isMobile:touch,hasTouch:touch,storageState:{cookies:[],origins:[{origin:new URL(base).origin,localStorage:[{name:'rubyRuleFrusQuestSave',value:JSON.stringify(saved)}]}]}});const errors=[];p.on('pageerror',e=>errors.push(String(e)));
  await p.addInitScript(()=>{window.qaPad={connected:false,index:0,id:'QA chapter controller',mapping:'standard',axes:[0,0],buttons:Array.from({length:16},()=>({pressed:false,value:0}))};Object.defineProperty(navigator,'getGamepads',{value:()=>window.qaPad.connected?[window.qaPad]:[]});});
  const state=()=>p.evaluate(()=>JSON.parse(window.render_game_to_text()));const desk=async()=>(await state()).compilerMission.chapterDesk;
  const click=async(selector)=>{const e=p.locator(selector);await e.scrollIntoViewIfNeeded();if(touch)await e.tap();else await e.click();await p.waitForTimeout(100);};
  const pad=async(index)=>{await p.evaluate(i=>{window.qaPad.connected=true;window.qaPad.buttons[i]={pressed:true,value:1};},index);await p.waitForTimeout(100);await p.evaluate(i=>window.qaPad.buttons[i]={pressed:false,value:0},index);await p.waitForTimeout(100);};
  const tap=async(x,y)=>{const r=await p.locator('canvas').first().boundingBox();await p.mouse.click(r.x+x*r.width/256,r.y+y*r.height/240);};
  const drain=async()=>{for(let i=0;i<90;i++){if((await state()).mode!=='dialog')return;await p.keyboard.press('Space');await p.waitForTimeout(100);}assert.fail('dialogue stuck');};
  const enter=async()=>{await drain();await p.waitForTimeout(650);await p.evaluate(()=>window.game.scene.getScene('ArchiveScene').player.setPosition(248,120));await p.keyboard.down('ArrowRight');await p.waitForTimeout(150);await p.keyboard.up('ArrowRight');await p.waitForSelector('.chapter-desk');await p.waitForTimeout(250);};
  const reload=async()=>{await click('.chapter-desk .manuscript-close');await p.reload();await p.waitForFunction(()=>window.game.scene.isActive('TapToStartScene'));await tap(86,154);await p.waitForFunction(()=>window.game.scene.isActive('ArchiveScene'));await enter();};
  await p.goto(base+'?text=full');await p.waitForFunction(()=>window.game?.scene.isActive('TapToStartScene'));await tap(86,154);await p.waitForFunction(()=>window.game.scene.isActive('ArchiveScene'));await enter();
  await p.screenshot({path:`${out}/${name}-chronology.png`});const player=(await state()).player;await p.keyboard.press('ArrowRight');await p.keyboard.press('ArrowLeft');assert.deepEqual((await state()).player,player);
  await click('.chapter-desk .manuscript-submit');assert.equal((await desk()).step,0);assert((await p.locator('[data-status]').innerText()).includes('discussion comes before'));
  await click('[data-focus-key="move-C-1"]');assert.deepEqual((await desk()).order,['A','C','B']);await reload();assert.deepEqual((await desk()).order,['A','C','B']);
  await click('[data-focus-key="move-C-1"]');assert.deepEqual((await desk()).order,['A','B','C']);await click('.chapter-desk .manuscript-submit');assert.equal((await desk()).step,1);
  await click('.chapter-desk .manuscript-submit');assert.equal((await desk()).step,1);
  await click('[data-source=A]');await click('[data-line="1"]');await click('.chapter-desk .manuscript-submit');assert.equal((await desk()).step,1);
  await click('[data-source=C]');assert.equal((await desk()).highlightedLine,null);await click('[data-line="0"]');await click('.chapter-desk .manuscript-submit');assert((await p.locator('[data-status]').innerText()).includes('actually supports'));
  await click('[data-line="1"]');await p.screenshot({path:`${out}/${name}-annotation.png`});await reload();assert.equal((await desk()).source,'C');assert.equal((await desk()).highlightedLine,1);await click('[data-source=C]');assert.equal((await desk()).highlightedLine,1);
  await click('.chapter-desk .manuscript-submit');assert.equal((await desk()).step,2);await click('.chapter-desk .manuscript-submit');assert.equal((await state()).compilerMission.completed,3);
  await click('[data-component=documents]');await click('[data-component=annotations]');await click('.chapter-desk .manuscript-submit');assert.equal((await state()).compilerMission.completed,3);
  await reload();assert.equal((await desk()).components.filter(c=>c.attached).length,2);
  if(name==='desktop'){await p.locator('[data-component=backup]').focus();await pad(0);assert((await desk()).components.every(c=>c.attached));await pad(1);await p.waitForSelector('.chapter-desk',{state:'detached'});await enter();assert((await desk()).components.every(c=>c.attached));}else await click('[data-component=backup]');
  for(const selector of ['.assembly-progress','.chapter-desk .manuscript-submit']){const r=await p.locator(selector).boundingBox();assert(r.y>=0&&r.y+r.height<=height,`${name}: controls stay visible`);}
  await p.screenshot({path:`${out}/${name}-packet.png`});await click('.chapter-desk .manuscript-submit');await p.waitForSelector('.chapter-desk',{state:'detached'});assert.equal((await state()).compilerMission.completed,4);
  await drain();await p.waitForFunction(()=>window.game.scene.getScene('ArchiveScene').researchChoice.active);assert((await state()).choice.title.includes('supervisor reviews'));assert.equal((await state()).compilerMission.dpdSubmitted,false);
  assert.deepEqual(errors,[]);results.push({name,touch,chronologyRetry:true,sourceAndPassageRetry:true,reloadedEachStage:true,missingPartsRejected:true,firstReviewReached:true,controller:name==='desktop',errors});await p.close();
 }
 await writeFile(out+'/result.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results));
}finally{await browser.close();}
