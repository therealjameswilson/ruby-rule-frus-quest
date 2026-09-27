import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {completeLibraryRequest} from './library-request-actions.mjs';
import {completeLibraryComparison} from './library-comparison-actions.mjs';
import {completeLibrarySourceNote} from './library-source-note-actions.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const base=process.env.FRUS_QA_URL??'http://127.0.0.1:5219/',out=process.env.FRUS_QA_OUT??'/tmp/frus-library-packet';await mkdir(out,{recursive:true});
const assignments=JSON.parse(await readFile('public/assets/research-world/library-assignments.json')).assignments;
const browser=await chromium.launch({args:['--disable-audio-output']});const results=[];
try {
 const seed=await browser.newPage();await seed.goto(base+'?scene=PresidentialLibraryScene');await seed.waitForFunction(()=>localStorage.getItem('rubyRuleFrusQuestSave'));
 const template=await seed.evaluate(()=>JSON.parse(localStorage.getItem('rubyRuleFrusQuestSave')));await seed.close();
 for(const [name,width,height,touch,legacy] of [['desktop',1280,900,false,false],['phone',390,844,true,false],['landscape',844,390,true,false],['legacy-completed',1280,900,false,true]]) {
  if(process.env.FRUS_QA_CASE&&process.env.FRUS_QA_CASE!==name)continue;
  const saved=structuredClone(template);Object.assign(saved.state,{currentScene:'PresidentialLibraryScene',mode:'explore',activeDialog:null,currentChoice:null,sceneProgress:{libraryResearchActive:assignments.findIndex(a=>a.library==='bush43'),libraryBriefed_v2_bush43:1,...(legacy?{libraryResearch_v2_bush43:4}:{}),...(name==='desktop'?{compilerLibraryReturn:1}:{})}});
  const page=await browser.newPage({viewport:{width,height},isMobile:touch,hasTouch:touch,storageState:{cookies:[],origins:[{origin:new URL(base).origin,localStorage:[{name:'rubyRuleFrusQuestSave',value:JSON.stringify(saved)}]}]}});
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.addInitScript(()=>{window.qaPad={connected:false,index:0,id:'Packet QA',mapping:'standard',axes:[0,0],buttons:Array.from({length:16},()=>({pressed:false,value:0}))};Object.defineProperty(navigator,'getGamepads',{value:()=>window.qaPad.connected?[window.qaPad]:[]});});
  const pad=async id=>{await page.evaluate(id=>{window.qaPad.connected=true;window.qaPad.buttons[id]={pressed:true,value:1};},id);await page.waitForTimeout(120);await page.evaluate(id=>window.qaPad.buttons[id]={pressed:false,value:0},id);await page.waitForTimeout(120);};
  const state=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
  const stage=async()=>(await state()).libraryResearch.find(l=>l.library==='bush43').completed;
  const load=async()=>{await page.goto(base);await page.waitForFunction(()=>window.game?.scene.isActive('TapToStartScene'));await page.waitForSelector('#boot-loader',{state:'hidden'});const r=await page.locator('canvas').first().boundingBox();await page.mouse.click(r.x+86*r.width/256,r.y+154*r.height/240);await page.waitForFunction(()=>window.game.scene.isActive('PresidentialLibraryScene'));};
  const action=async()=>{if(touch&&height>width)await page.locator('#portrait-touch-dock [data-control="space"]').tap();else await page.keyboard.press('Space');await page.waitForTimeout(180);};
  const dismiss=async()=>{for(let n=0;n<20;n++){if(!await page.evaluate(()=>window.game.scene.getScene('PresidentialLibraryScene').dialog.active))return;await action();}throw Error('Dialog did not close');};
  const open=async(x,y)=>{await page.evaluate(([x,y])=>window.game.scene.getScene('PresidentialLibraryScene').player.setPosition(x,y),[x,y]);await page.waitForTimeout(200);await action();};
  const click=async selector=>{const e=page.locator('.library-packet '+selector);await e.scrollIntoViewIfNeeded();if(touch)await e.tap();else await e.click();await page.waitForTimeout(90);};
  await load();const before=(await state()).documentPoints;
  if(legacy){
   assert.equal(await stage(),4);assert.equal((await state()).objective,'REVIEW RESEARCH PACKET');await open(48,186);await page.waitForSelector('.library-packet');assert(await page.locator('[data-attach]').isDisabled());
   await click('.manuscript-submit');assert((await page.locator('[data-status]').innerText()).includes('Revisit'));assert(!(await state()).libraryPackets.bush43.filed);
   await page.waitForTimeout(500);await page.screenshot({path:out+'/legacy-missing.png'});await click('.manuscript-close');
   assert((await page.evaluate(()=>window.game.scene.getScene('PresidentialLibraryScene').marks.map(m=>m.text))).slice(0,3).every(t=>t.includes('REVISIT')));
  }
  await open(48,118);await page.waitForSelector('.library-request');await completeLibraryRequest(page);await dismiss();
  await open(202,118);await page.waitForSelector('.library-comparison');await completeLibraryComparison(page);await dismiss();
  await open(202,186);await page.waitForSelector('.library-source-note');await completeLibrarySourceNote(page);await dismiss();
  assert.equal(await stage(),legacy?4:3);assert.equal((await state()).documentPoints,before);
  await open(48,186);await page.waitForSelector('.library-packet');await page.waitForTimeout(180);await page.screenshot({path:out+'/'+name+'-packet.png'});
  const assembled=(await state()).libraryPackets.bush43;assert(assembled.parts[0].contents[0].includes('EP-3 collision'));assert(assembled.parts[1].contents[1].includes('177 released in full'));assert.equal(assembled.parts[1].sources.length,1);assert(assembled.parts.every(p=>p.ready&&!p.attached));assert.equal(assembled.openWork.length,3);
  await click('.manuscript-submit');assert((await page.locator('[data-status]').innerText()).includes('Attach'));assert.equal(await stage(),legacy?4:3);
  if(!touch){await page.locator('[data-part="1"]').focus();await pad(15);await pad(0);assert.equal(await page.locator('[data-part="2"]').getAttribute('aria-pressed'),'true');await page.keyboard.press('f');await page.waitForFunction(()=>Boolean(document.fullscreenElement));}
  else await click('[data-part="2"]');
  await click('[data-attach]');await click('[data-focus-key="read"]');await page.screenshot({path:out+'/'+name+'-comparison.png'});await click('.manuscript-close');await load();await open(48,186);await page.waitForSelector('.library-packet');
  assert.deepEqual((await state()).libraryPackets.bush43.parts.map(p=>p.attached),[false,true,false]);
  for(const id of [1,3]){await click(`[data-part="${id}"]`);await click('[data-attach]');}
  await click('[data-part="1"]');await click('[data-attach]');await click('.manuscript-submit');assert((await page.locator('[data-status]').innerText()).includes('release record'));await click('[data-attach]');
  await click('[data-part="3"]');await click('[data-focus-key="read"]');await page.screenshot({path:out+'/'+name+'-note.png'});
  await click('[data-focus-key="open-work"]');await page.screenshot({path:out+'/'+name+'-open-work.png'});
  assert(!await page.locator('.library-packet').evaluate(e=>e.scrollWidth>innerWidth+1));
  await click('.manuscript-submit');await page.waitForSelector('.library-packet',{state:'detached'});assert.equal(await stage(),4);assert.equal((await state()).documentPoints,before+(legacy?0:8));assert((await state()).libraryPackets.bush43.filed);
  await load();await open(48,186);await page.waitForSelector('.library-packet');assert.equal(await page.locator('.library-packet h1').innerText(),'Your filed research packet.');assert.equal(await page.locator('.library-packet [data-attach]').count(),0);
  const filed=(await state()).libraryPackets.bush43;assert(filed.parts.every(p=>p.attached&&p.ready));assert.equal(filed.openWork.length,3);assert.equal((await state()).documentPoints,before+(legacy?0:8));
  await click('.manuscript-submit');assert.equal((await state()).documentPoints,before+(legacy?0:8));
  let returned=false;
  if(name==='desktop') {await page.waitForTimeout(250);await page.keyboard.press('Enter');await page.waitForFunction(()=>window.game.scene.isActive('ArchiveScene'));returned=true;}
  assert.deepEqual(errors,[]);results.push({name,legacy,stage:await stage(),reward:(await state()).documentPoints-before,returned,packet:filed,errors});await page.close();
 }
} catch(error) {for(const c of browser.contexts())for(const p of c.pages()){console.error(await p.evaluate(()=>window.render_game_to_text?.()).catch(String));await p.screenshot({path:out+'/failure.png'}).catch(()=>{});}throw error;}
finally {await browser.close();}
await writeFile(out+'/result.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results.map(r=>({name:r.name,stage:r.stage,reward:r.reward,returned:r.returned,errors:r.errors}))));
