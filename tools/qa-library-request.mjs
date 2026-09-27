import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const base=process.env.FRUS_QA_URL??'http://127.0.0.1:5219/',out=process.env.FRUS_QA_OUT??'/tmp/frus-library-request';await mkdir(out,{recursive:true});
const library=process.env.FRUS_QA_LIBRARY??'reagan',target=library==='reagan'?2:1,wrong=library==='bush41'?2:1,digital=['clinton','bush43'].includes(library);
const assignments=JSON.parse(await readFile('public/assets/research-world/library-assignments.json','utf8')).assignments;
const b=await chromium.launch({args:['--disable-audio-output']});const results=[];
try{
 const seed=await b.newPage();await seed.goto(base+'?scene=PresidentialLibraryScene');await seed.waitForFunction(()=>localStorage.getItem('rubyRuleFrusQuestSave'));const template=await seed.evaluate(()=>JSON.parse(localStorage.getItem('rubyRuleFrusQuestSave')));await seed.close();
 for(const [name,width,height,touch] of [['desktop',1280,900,false],['phone',390,844,true],['landscape',844,390,true]]){
  if(process.env.FRUS_QA_DEVICE&&process.env.FRUS_QA_DEVICE!==name)continue;
  const saved=structuredClone(template);saved.state.currentScene='PresidentialLibraryScene';saved.state.mode='explore';saved.state.activeDialog=null;saved.state.currentChoice=null;saved.state.sceneProgress={libraryResearchActive:assignments.findIndex(a=>a.library===library),['libraryBriefed_v2_'+library]:1};
  const p=await b.newPage({viewport:{width,height},isMobile:touch,hasTouch:touch,storageState:{cookies:[],origins:[{origin:new URL(base).origin,localStorage:[{name:'rubyRuleFrusQuestSave',value:JSON.stringify(saved)}]}]}});const errors=[];p.on('pageerror',e=>errors.push(String(e)));
  await p.addInitScript(()=>{window.qaPad={connected:false,index:0,id:'Request desk QA controller',mapping:'standard',axes:[0,0],buttons:Array.from({length:16},()=>({pressed:false,value:0}))};Object.defineProperty(navigator,'getGamepads',{value:()=>window.qaPad.connected?[window.qaPad]:[]});});
  const pad=async i=>{await p.evaluate(i=>{window.qaPad.connected=true;window.qaPad.buttons[i]={pressed:true,value:1};},i);await p.waitForTimeout(120);await p.evaluate(i=>window.qaPad.buttons[i]={pressed:false,value:0},i);await p.waitForTimeout(120);};
  const state=()=>p.evaluate(()=>JSON.parse(window.render_game_to_text()));
  const stage=async()=>(await state()).libraryResearch.find(l=>l.library===library).completed;
  const click=async sel=>{const el=p.locator('.library-request '+sel);await el.scrollIntoViewIfNeeded();if(touch)await el.tap();else await el.click();await p.waitForTimeout(Number(process.env.FRUS_QA_TAP_PAUSE??150));if(process.env.FRUS_QA_TRACE)console.log(name,sel,(await state()).libraryRequests[library]);};
  const load=async()=>{await p.goto(base);await p.waitForFunction(()=>window.game?.scene.isActive('TapToStartScene'));const r=await p.locator('canvas').first().boundingBox();await p.mouse.click(r.x+86*r.width/256,r.y+154*r.height/240);await p.waitForFunction(()=>window.game.scene.isActive('PresidentialLibraryScene'));};
  const open=async()=>{await p.evaluate(()=>window.game.scene.getScene('PresidentialLibraryScene').player.setPosition(48,118));await p.waitForTimeout(300);if(touch&&height>width)await p.locator('#portrait-touch-dock [data-control="space"]').tap();else await p.keyboard.press('Space');await p.waitForSelector('.library-request');await p.waitForTimeout(250);};
  await load();await open();await p.screenshot({path:out+'/'+name+'-catalog.png'});
  await click('.manuscript-submit');assert.equal(await stage(),0);assert((await p.locator('[data-status]').innerText()).includes(digital?'Open':library==='bush41'?'Request Arms Control':'Match both'));
  if(!digital){await click(`[data-entry="${wrong}"]`);await click('[data-attach]');await click('.manuscript-submit');assert.equal(await stage(),0);}
  if(!touch){await p.locator(digital?'[data-focus-key="source-link"]':`[data-entry="${wrong}"]`).focus();await pad(library==='bush41'?14:15);await pad(0);assert.equal((await state()).libraryRequests[library].entry.id,target);await p.keyboard.press('f');await p.waitForTimeout(500);assert(await p.evaluate(()=>Boolean(document.fullscreenElement)));}else await click(`[data-entry="${target}"]`);assert.equal((await state()).libraryRequests[library].locator,null);await click('[data-attach]');await click('[data-access="2"]');await click('.manuscript-submit');assert((await p.locator('[data-status]').innerText()).includes(library==='clinton'?'scanned release':library==='bush43'?'inventory reports':library==='bush41'?'On Site':'OPEN describes access'));assert.equal(await stage(),0);
  await click('[data-access="1"]');
  if(digital){await click('[data-provenance="2"]');await click('.manuscript-submit');assert.equal(await stage(),0);assert((await p.locator('[data-status]').innerText()).includes(library==='clinton'?'MDR':'FOIA'));await click('[data-provenance="1"]');if(library==='bush43'){await click('.manuscript-submit');assert((await p.locator('[data-status]').innerText()).includes('release breakdown'));await click('[data-release]');}}
  await click('[data-followup="retrieval"]');assert.equal((await state()).libraryRequests[library].entry.id,target);assert.equal(await p.evaluate(library=>JSON.parse(localStorage.getItem('rubyRuleFrusQuestSave')).state.sceneProgress['libraryRequest_'+library+'_entry'],library),target);await click('.manuscript-close');assert.equal((await state()).libraryRequests[library].entry.id,target);await load();await open();assert.equal((await state()).libraryRequests[library].entry.id,target);assert((await state()).libraryRequests[library].retrieval);assert(!(await state()).libraryRequests[library].withdrawals);
  await click('.manuscript-submit');assert((await p.locator('[data-status]').innerText()).includes('both follow-ups'));
  await click('[data-followup="withdrawals"]');await p.screenshot({path:out+'/'+name+'-request.png'});
  const overflow=await p.locator('.library-request').evaluate(e=>e.scrollWidth>innerWidth+1);assert(!overflow,'No horizontal overflow');
  await click('.manuscript-submit');await p.waitForSelector('.library-request',{state:'detached'});assert.equal(await stage(),1);assert.equal(await p.evaluate(()=>document.body.style.touchAction),'');
  await p.reload();await p.waitForFunction(()=>window.game?.scene.isActive('TapToStartScene'));await p.keyboard.press('Enter');await p.waitForFunction(()=>window.game.scene.isActive('PresidentialLibraryScene'));assert.equal(await stage(),1);
  assert.deepEqual(errors,[]);results.push({name,library,stage:await stage(),request:(await state()).libraryRequests[library],errors});await p.close();
 }
}catch(error){
 for(const context of b.contexts())for(const page of context.pages()){
  console.error('Failure snapshot',await page.evaluate(()=>({url:location.href,ready:document.readyState,scene:window.game?.scene.getScenes(true).map(s=>s.scene.key),state:window.render_game_to_text?.(),resources:performance.getEntriesByType('resource').slice(-8).map(r=>({name:r.name,duration:r.duration}))})).catch(String));
  await page.screenshot({path:out+'/failure.png'}).catch(()=>{});
 }
 throw error;
}finally{await b.close();}
await writeFile(out+'/result.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results));
