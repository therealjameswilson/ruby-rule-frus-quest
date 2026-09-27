import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {completeLibraryRequest} from './library-request-actions.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const base=process.env.FRUS_QA_URL??'http://127.0.0.1:5219/',out=process.env.FRUS_QA_OUT??'/tmp/frus-library-comparison';
await mkdir(out,{recursive:true});
const assignments=JSON.parse(await readFile('public/assets/research-world/library-assignments.json')).assignments;
const browser=await chromium.launch({args:['--disable-audio-output']});const results=[];
try {
 const seed=await browser.newPage();await seed.goto(base+'?scene=PresidentialLibraryScene');
 await seed.waitForFunction(()=>localStorage.getItem('rubyRuleFrusQuestSave'));
 const template=await seed.evaluate(()=>JSON.parse(localStorage.getItem('rubyRuleFrusQuestSave')));await seed.close();
 for(const [name,width,height,touch] of [['desktop',1280,900,false],['phone',390,844,true],['landscape',844,390,true]]) {
  const saved=structuredClone(template);
  Object.assign(saved.state,{currentScene:'PresidentialLibraryScene',mode:'explore',activeDialog:null,currentChoice:null,sceneProgress:{libraryResearchActive:assignments.findIndex(a=>a.library==='bush43'),libraryBriefed_v2_bush43:1}});
  const page=await browser.newPage({viewport:{width,height},isMobile:touch,hasTouch:touch,storageState:{cookies:[],origins:[{origin:new URL(base).origin,localStorage:[{name:'rubyRuleFrusQuestSave',value:JSON.stringify(saved)}]}]}});
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.addInitScript(()=>{window.qaPad={connected:false,index:0,id:'Comparison QA',mapping:'standard',axes:[0,0],buttons:Array.from({length:16},()=>({pressed:false,value:0}))};Object.defineProperty(navigator,'getGamepads',{value:()=>window.qaPad.connected?[window.qaPad]:[]});});
  const pad=async id=>{await page.evaluate(id=>{window.qaPad.connected=true;window.qaPad.buttons[id]={pressed:true,value:1};},id);await page.waitForTimeout(120);await page.evaluate(id=>window.qaPad.buttons[id]={pressed:false,value:0},id);await page.waitForTimeout(120);};
  const state=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
  const stage=async()=>(await state()).libraryResearch.find(l=>l.library==='bush43').completed;
  const load=async()=>{
   await page.goto(base);await page.waitForFunction(()=>window.game?.scene.isActive('TapToStartScene'));
   await page.waitForSelector('#boot-loader',{state:'hidden'});
   const r=await page.locator('canvas').first().boundingBox();
   await page.mouse.click(r.x+86*r.width/256,r.y+154*r.height/240);
   await page.waitForFunction(()=>window.game.scene.isActive('PresidentialLibraryScene'));
  };
  const action=async()=>{if(touch&&height>width)await page.locator('#portrait-touch-dock [data-control="space"]').tap();else await page.keyboard.press('Space');await page.waitForTimeout(180);};
  const open=async x=>{await page.evaluate(x=>window.game.scene.getScene('PresidentialLibraryScene').player.setPosition(x,118),x);await page.waitForTimeout(200);await action();};
  const click=async selector=>{const element=page.locator('.library-comparison '+selector);await element.scrollIntoViewIfNeeded();if(touch)await element.tap();else await element.click();await page.waitForTimeout(90);};
  await load();await open(48);await page.waitForSelector('.library-request');await completeLibraryRequest(page,1);
  for(let n=0;n<20;n++){if(!await page.evaluate(()=>window.game.scene.getScene('PresidentialLibraryScene').dialog.active))break;await action();}
  assert.equal(await stage(),1);
  await open(202);await page.waitForSelector('.library-comparison');await page.waitForTimeout(200);
  await page.screenshot({path:out+'/'+name+'-sources.png'});
  await click('.manuscript-submit');assert.equal(await stage(),1);
  assert((await page.locator('[data-status]').innerText()).includes('Place'));
  if(!touch){
   await page.locator('[data-card="1"] [data-lane="1"]').focus();await pad(15);await pad(0);
   assert.equal((await state()).libraryComparisons.bush43.cards[0].lane,2);
   await page.keyboard.press('f');await page.waitForFunction(()=>Boolean(document.fullscreenElement));
  }else await click('[data-card="1"] [data-lane="2"]');
  await click('.manuscript-submit');assert.equal(await stage(),1);assert((await page.locator('[data-status]').innerText()).includes('identifier and requested span'));
  await click('[data-card="1"] [data-lane="1"]');
  await click('[data-card="2"] [data-lane="2"]');
  await click('.manuscript-close');await load();await open(202);await page.waitForSelector('.library-comparison');
  assert.deepEqual((await state()).libraryComparisons.bush43.cards.map(c=>c.lane),[1,2,0,0]);assert.equal(await stage(),1);
  await click('[data-card="3"] [data-lane="3"]');await click('[data-card="4"] [data-lane="2"]');
  await click('.manuscript-submit');assert.equal(await stage(),1);assert((await page.locator('[data-status]').innerText()).includes('totals cannot answer'));
  await click('[data-card="4"] [data-lane="3"]');await click('[data-followup="1"]');
  await click('.manuscript-submit');assert.equal(await stage(),1);assert((await page.locator('[data-status]').innerText()).includes('both tasks'));
  await click('[data-followup="2"]');
  await page.screenshot({path:out+'/'+name+'-table.png'});
  assert(!await page.locator('.library-comparison').evaluate(e=>e.scrollWidth>innerWidth+1));
  await click('.manuscript-submit');await page.waitForSelector('.library-comparison',{state:'detached'});
  assert.equal(await stage(),2);assert.equal(await page.evaluate(()=>document.body.style.touchAction),'');
  await load();assert.equal(await stage(),2);
  assert.deepEqual((await state()).libraryComparisons.bush43.cards.map(c=>c.lane),[1,2,3,3]);
  assert.deepEqual(await page.evaluate(()=>window.game.scene.getScene('PresidentialLibraryScene').barriers.map(b=>b.visible)),[false,false]);
  const filedState=(await state()).libraryComparisons.bush43, points=(await state()).documentPoints;
  await open(202);await page.waitForSelector('.library-comparison');
  assert.equal(await page.locator('.library-comparison h1').innerText(),'Your filed evidence comparison.');
  assert.equal(await page.locator('.library-comparison [data-lane], .library-comparison [data-followup]').count(),0);
  assert.equal(await page.locator('.comparison-filed').count(),4);
  assert((await page.locator('.comparison-table').innerText()).includes('Pending: Examine released assets'));
  await page.screenshot({path:out+'/'+name+'-filed-review.png'});
  await click('.manuscript-submit');await page.waitForSelector('.library-comparison',{state:'detached'});
  assert.equal(await stage(),2);assert.equal((await state()).documentPoints,points);
  assert.deepEqual((await state()).libraryComparisons.bush43,filedState);
  assert.deepEqual(errors,[]);results.push({name,stage:await stage(),comparison:(await state()).libraryComparisons.bush43,errors});await page.close();
 }
} catch(error) {
 for(const context of browser.contexts())for(const page of context.pages())await page.screenshot({path:out+'/failure.png'}).catch(()=>{});
 throw error;
} finally {await browser.close();}
await writeFile(out+'/result.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results));
