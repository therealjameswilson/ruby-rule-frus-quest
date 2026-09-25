import assert from 'node:assert/strict';import {readFile,mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');const assignments=JSON.parse(await readFile('public/assets/research-world/library-assignments.json')).assignments;const base=process.env.FRUS_QA_URL??'http://127.0.0.1:5211/';const out=process.env.FRUS_QA_OUT??'/tmp/library-receipt-restore';await mkdir(out,{recursive:true});const b=await chromium.launch();
try{
const seed=await b.newPage();await seed.goto(new URL('?scene=PresidentialLibraryScene',base).href);await seed.waitForFunction(()=>localStorage.getItem('rubyRuleFrusQuestSave'));
const saved=await seed.evaluate(()=>JSON.parse(localStorage.getItem('rubyRuleFrusQuestSave')));await seed.close();
saved.state.currentScene='PresidentialLibraryScene';saved.state.mode='explore';saved.state.activeDialog=null;saved.state.currentChoice=null;
saved.state.sceneProgress={libraryResearchActive:assignments.findIndex(a=>a.library==='reagan'),libraryResearch_reagan:2,libraryBriefed_reagan:1};
const p=await b.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true,storageState:{cookies:[],origins:[{origin:new URL(base).origin,localStorage:[{name:'rubyRuleFrusQuestSave',value:JSON.stringify(saved)}]}]}}),errors=[];
p.on('pageerror',e=>errors.push(String(e)));
for(let reload=0;reload<2;reload++){await p.goto(base);await p.waitForFunction(()=>window.game?.scene.isActive('TapToStartScene'));await p.keyboard.press('Enter');await p.waitForFunction(()=>window.game.scene.isActive('PresidentialLibraryScene'));const visible=await p.evaluate(()=>window.game.scene.getScene('PresidentialLibraryScene').receipts.map(r=>r.visible));assert.deepEqual(visible,[true,true,false,false]);}
await p.screenshot({path:`${out}/restored.png`});assert.deepEqual(errors,[]);const result={savedStage:2,visible:[true,true,false,false],reloads:2,errors,limitation:'Saved-state fixture for presentation restoration; earned progression verified separately'};await writeFile(`${out}/result.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result));}finally{await b.close();}
