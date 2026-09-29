const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
import {mkdir,writeFile} from 'node:fs/promises';import assert from 'node:assert/strict';
const out=process.env.FRUS_QA_OUT??'/tmp/frus-journal-qa';await mkdir(out,{recursive:true});const b=await chromium.launch(),results=[];
try{for(const [name,width,height] of [['desktop',1280,900],['phone',375,667],['small',320,568],['landscape',844,390]]){
 const p=await b.newPage({viewport:{width,height},hasTouch:true}),errors=[];p.on('pageerror',e=>errors.push(String(e)));
 await p.addInitScript(()=>{window.pad={id:'QA',index:0,connected:true,mapping:'standard',axes:[0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};Object.defineProperty(navigator,'getGamepads',{value:()=>[window.pad]});});
 await p.goto(new URL('?scene=ResearchWorldScene',process.env.FRUS_QA_URL??'http://127.0.0.1:5236/').href);await p.waitForFunction(()=>window.game?.scene.isActive('ResearchWorldScene'));await p.waitForTimeout(350);
 const pad=async(i)=>{await p.evaluate(i=>window.pad.buttons[i]={pressed:true,value:1},i);await p.waitForTimeout(100);await p.evaluate(i=>window.pad.buttons[i]={pressed:false,value:0},i);await p.waitForTimeout(100);};
 const state=()=>p.evaluate(()=>JSON.parse(window.render_game_to_text()));const before=await state();
 await p.evaluate(()=>window.game.scene.getScene('ResearchWorldScene').journal());await p.waitForTimeout(300);await p.screenshot({path:out+'/'+name+'-empty.png'});
 const close=p.locator('.research-journal [data-focus-key=leave]');const r=await close.boundingBox();assert(r.width>=44&&r.height>=44&&r.y>=0&&r.y+r.height<=height);await close.tap();
 // View-only discovery fixture; do not grant the campaign any discoveries.
 await p.evaluate(async()=>{const {RESEARCH_LANDMARKS}=await import('/src/game/researchWorld.ts');const scene=window.game.scene.getScene('ResearchWorldScene');scene.journal();const View=scene.journalDesk.constructor;scene.closeJournal();const progress=Object.fromEntries(RESEARCH_LANDMARKS.map(l=>[`researchVisited_${l.id}`,1]));scene.journalDesk=new View(progress,()=>scene.closeJournal());});
 assert.equal(await p.locator('.journal-place').count(),16);
 await p.waitForTimeout(150);await pad(13);await pad(0);assert.equal(await p.locator('#journal-title').innerText(),'Library of Congress');await p.locator('[data-focus-key=places]').tap();
 await p.locator('[data-focus-key=loc]').tap();assert.match(await p.locator('.journal-reading').innerText(),/Haig/);await p.waitForTimeout(250);await p.screenshot({path:out+'/'+name+'-loc.png'});
 let overflow=await p.locator('.research-journal .manuscript-body').evaluate(e=>e.scrollHeight>e.clientHeight+4);await p.keyboard.press('ArrowDown');if(overflow)assert(await p.locator('.research-journal .manuscript-body').evaluate(e=>e.scrollTop)>0);
 await p.locator('[data-focus-key=places]').tap();await p.locator('[data-focus-key=bush41]').tap();assert.match(await p.locator('.journal-reading').innerText(),/NSC wing/);
 assert.deepEqual((await state()).sceneProgress,before.sceneProgress);assert.equal((await state()).documentPoints,before.documentPoints);assert.deepEqual((await state()).player,before.player);

 await pad(1);assert.equal(await p.locator('.research-journal').count(),0);
 await p.evaluate(()=>window.game.scene.getScene('ResearchWorldScene').journal());await p.waitForTimeout(200);await p.keyboard.press('Escape');assert.equal(await p.locator('.research-journal').count(),0);
 await p.evaluate(()=>{const s=window.game.scene.getScene('ResearchWorldScene');s.journal();window.game.scene.stop('ResearchWorldScene');});assert.equal(await p.locator('.research-journal').count(),0);assert.deepEqual(errors,[]);
 results.push({name,empty:true,allPlaces:true,collectionDetails:true,noProgressMutation:true,stationary:true,touchKeyboardController:true,cleanup:true});await p.close();
}await writeFile(out+'/result.json',JSON.stringify(results,null,2));console.log('PASS native research journal four layouts');}finally{await b.close();}
