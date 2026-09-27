import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {completeLibraryRequest} from './library-request-actions.mjs';
import {completeLibraryComparison} from './library-comparison-actions.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const base=process.env.FRUS_QA_URL??'http://127.0.0.1:5219/',out=process.env.FRUS_QA_OUT??'/tmp/frus-library-source-note';await mkdir(out,{recursive:true});
const assignments=JSON.parse(await readFile('public/assets/research-world/library-assignments.json')).assignments;
const browser=await chromium.launch({args:['--disable-audio-output']});const results=[];
try {
 const seed=await browser.newPage();await seed.goto(base+'?scene=PresidentialLibraryScene');await seed.waitForFunction(()=>localStorage.getItem('rubyRuleFrusQuestSave'));
 const template=await seed.evaluate(()=>JSON.parse(localStorage.getItem('rubyRuleFrusQuestSave')));await seed.close();
 for(const [name,width,height,touch] of [['desktop',1280,900,false],['phone',390,844,true],['landscape',844,390,true]]) {
  const saved=structuredClone(template);Object.assign(saved.state,{currentScene:'PresidentialLibraryScene',mode:'explore',activeDialog:null,currentChoice:null,sceneProgress:{libraryResearchActive:assignments.findIndex(a=>a.library==='bush41'),libraryBriefed_v2_bush41:1}});
  const page=await browser.newPage({viewport:{width,height},isMobile:touch,hasTouch:touch,storageState:{cookies:[],origins:[{origin:new URL(base).origin,localStorage:[{name:'rubyRuleFrusQuestSave',value:JSON.stringify(saved)}]}]}});
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.addInitScript(()=>{window.qaPad={connected:false,index:0,id:'Source note QA',mapping:'standard',axes:[0,0],buttons:Array.from({length:16},()=>({pressed:false,value:0}))};Object.defineProperty(navigator,'getGamepads',{value:()=>window.qaPad.connected?[window.qaPad]:[]});});
  const pad=async id=>{await page.evaluate(id=>{window.qaPad.connected=true;window.qaPad.buttons[id]={pressed:true,value:1};},id);await page.waitForTimeout(120);await page.evaluate(id=>window.qaPad.buttons[id]={pressed:false,value:0},id);await page.waitForTimeout(120);};
  const state=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
  const stage=async()=>(await state()).libraryResearch.find(l=>l.library==='bush41').completed;
  const load=async()=>{await page.goto(base);await page.waitForFunction(()=>window.game?.scene.isActive('TapToStartScene'));await page.waitForSelector('#boot-loader',{state:'hidden'});const r=await page.locator('canvas').first().boundingBox();await page.mouse.click(r.x+86*r.width/256,r.y+154*r.height/240);await page.waitForFunction(()=>window.game.scene.isActive('PresidentialLibraryScene'));};
  const action=async()=>{if(touch&&height>width)await page.locator('#portrait-touch-dock [data-control="space"]').tap();else await page.keyboard.press('Space');await page.waitForTimeout(180);};
  const dismiss=async()=>{for(let n=0;n<20;n++){if(!await page.evaluate(()=>window.game.scene.getScene('PresidentialLibraryScene').dialog.active))return;await action();}throw Error('Dialog did not close');};
  const open=async(x,y)=>{await page.evaluate(([x,y])=>window.game.scene.getScene('PresidentialLibraryScene').player.setPosition(x,y),[x,y]);await page.waitForTimeout(200);await action();};
  const click=async selector=>{const e=page.locator('.library-source-note '+selector);await e.scrollIntoViewIfNeeded();if(touch)await e.tap();else await e.click();await page.waitForTimeout(90);};
  await load();await open(48,118);await page.waitForSelector('.library-request');await completeLibraryRequest(page);await dismiss();
  await open(202,118);await page.waitForSelector('.library-comparison');await completeLibraryComparison(page);await dismiss();assert.equal(await stage(),2);
  await open(202,186);await page.waitForSelector('.library-source-note');await page.waitForTimeout(200);await page.screenshot({path:out+'/'+name+'-editor.png'});
  await click('.manuscript-submit');assert.equal(await stage(),2);assert((await page.locator('[data-status]').innerText()).includes('Complete'));
  if(!touch){await page.locator('[data-field="kind"] [data-value="1"]').focus();await pad(15);await pad(0);assert.equal((await state()).librarySourceNotes.bush41.fields.kind,2);await page.keyboard.press('f');await page.waitForFunction(()=>Boolean(document.fullscreenElement));}
  else await click('[data-field="kind"] [data-value="2"]');
  await click('.manuscript-submit');assert((await page.locator('[data-status]').innerText()).includes('inventory describes holdings'));assert.equal(await stage(),2);
  await click('[data-field="kind"] [data-value="1"]');await click('[data-field="date"] [data-value="2"]');await click('.manuscript-submit');assert((await page.locator('[data-status]').innerText()).includes('collection date range'));
  await click('[data-field="date"] [data-value="1"]');await click('[data-field="locator"] [data-value="2"]');await click('.manuscript-submit');assert((await page.locator('[data-status]').innerText()).includes('both local IDs'));assert.equal(await stage(),2);
  await click('[data-field="locator"] [data-value="1"]');await click('.manuscript-close');await load();await open(202,186);await page.waitForSelector('.library-source-note');
  assert.deepEqual((await state()).librarySourceNotes.bush41.fields,{kind:1,date:1,locator:1,scope:0});
  await click('[data-field="scope"] [data-value="2"]');await click('.manuscript-submit');assert((await page.locator('[data-status]').innerText()).includes('No examined document'));
  await click('[data-field="scope"] [data-value="1"]');await click('[data-log="lead"]');await click('.manuscript-submit');assert((await page.locator('[data-status]').innerText()).includes('both unexamined leads'));assert.equal(await stage(),2);
  await click('[data-log="followups"]');await click('[data-focus-key="preview"]');assert(await page.locator('.source-note-preview h2').evaluate(e=>{const r=e.getBoundingClientRect(),body=e.closest('.manuscript-body').getBoundingClientRect();return r.top>=body.top&&r.top<body.bottom;}));await page.screenshot({path:out+'/'+name+'-note.png'});
  const note=(await state()).librarySourceNotes.bush41;assert(note.citation.includes('CF00715-001'));assert(note.citation.includes('CF00715-002'));assert(note.researchLog[0].includes('Unexamined leads'));assert(note.heading.includes('individual document dates pending'));assert.equal(note.researchLog.length,3);
  assert(!await page.locator('.library-source-note').evaluate(e=>e.scrollWidth>innerWidth+1));
  await click('.manuscript-submit');await page.waitForSelector('.library-source-note',{state:'detached'});assert.equal(await stage(),3);assert.equal(await page.evaluate(()=>document.body.style.touchAction),'');
  await load();assert.equal(await stage(),3);await open(202,186);await page.waitForSelector('.library-source-note');assert.equal(await page.locator('.library-source-note h1').innerText(),'Your filed research log.');assert.equal(await page.locator('.library-source-note [data-field]').count(),0);
  await click('[data-focus-key="preview"]');assert(await page.locator('.source-note-preview h2').evaluate(e=>{const r=e.getBoundingClientRect(),body=e.closest('.manuscript-body').getBoundingClientRect();return r.top>=body.top&&r.top<body.bottom;}));await page.screenshot({path:out+'/'+name+'-filed.png'});assert.deepEqual((await state()).librarySourceNotes.bush41,note);
  await click('.manuscript-submit');assert.equal(await stage(),3);assert.deepEqual((await state()).librarySourceNotes.bush41,note);
  assert.deepEqual(errors,[]);results.push({name,stage:await stage(),note,reviewPreserved:true,errors});await page.close();
 }
} catch(error) {for(const c of browser.contexts())for(const p of c.pages())await p.screenshot({path:out+'/failure.png'}).catch(()=>{});throw error;}
finally {await browser.close();}
await writeFile(out+'/result.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results.map(r=>({name:r.name,stage:r.stage,reviewPreserved:r.reviewPreserved,errors:r.errors}))));
