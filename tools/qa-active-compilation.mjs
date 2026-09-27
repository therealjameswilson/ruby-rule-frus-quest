// Focused scene fixtures; pointer/touch choices are real. Not a full campaign replay.
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const base=process.env.FRUS_QA_URL??'http://127.0.0.1:5218/';
const out=process.env.FRUS_QA_OUT??'/tmp/frus-active-compilation';await mkdir(out,{recursive:true});
const dossiers=JSON.parse(await readFile('public/assets/research-world/active-compilation.json')).dossiers;
const assignments=JSON.parse(await readFile('public/assets/research-world/library-assignments.json')).assignments;
const browser=await chromium.launch();const results=[];
try{
 const seed=await browser.newPage();await seed.goto(base+'?scene=PresidentialLibraryScene&text=full');await seed.waitForFunction(()=>localStorage.getItem('rubyRuleFrusQuestSave'));const template=await seed.evaluate(()=>JSON.parse(localStorage.getItem('rubyRuleFrusQuestSave')));await seed.close();
 for(const mobile of [false,true])for(const [index,d] of dossiers.entries()){
  const saved=structuredClone(template);saved.state.currentScene='OfficeScene';saved.state.mode='explore';saved.state.activeDialog=null;saved.state.currentChoice=null;
  saved.state.sceneProgress={officeStarterMemoStatus:2,juniorCompilerIntroduced:1,kathyDeparted:1,compilerVolumeAssignment:index+1};
  const p=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1024,height:960},isMobile:mobile,hasTouch:mobile,storageState:{cookies:[],origins:[{origin:new URL(base).origin,localStorage:[{name:'rubyRuleFrusQuestSave',value:JSON.stringify(saved)}]}]}});
  const errors=[];p.on('pageerror',e=>errors.push(String(e)));
  const tap=async(x,y)=>{const b=await p.locator('canvas').first().boundingBox();const xx=b.x+x*b.width/256,yy=b.y+y*b.height/240;if(mobile)await p.touchscreen.tap(xx,yy);else await p.mouse.click(xx,yy);};
  const act=async()=>{const dock=p.locator('#portrait-touch-dock [data-control=space]');if(mobile&&await dock.isVisible()){const b=await dock.boundingBox();await p.touchscreen.tap(b.x+b.width/2,b.y+b.height/2);}else await p.keyboard.press('Space');await p.waitForTimeout(100);};
  const drain=async(scene)=>{for(let i=0;i<90;i++){if(!await p.evaluate(s=>window.game.scene.getScene(s).dialog?.active,scene))return;await act();}assert.fail('dialogue did not close');};
  const choose=async(scene,field,row)=>{await p.waitForFunction(({scene,field})=>window.game.scene.getScene(scene)[field]?.active,{scene,field});await p.waitForTimeout(210);const point=await p.evaluate(({scene,field,row})=>{const b=window.game.scene.getScene(scene)[field].rows[row].getBounds();return {x:b.centerX,y:b.centerY};},{scene,field,row});await tap(point.x,point.y);await p.waitForTimeout(110);};
  const progress=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('rubyRuleFrusQuestSave')).state.sceneProgress);
  const place=async(scene,x,y)=>{await p.evaluate(({scene,x,y})=>window.game.scene.getScene(scene).player.setPosition(x,y),{scene,x,y});await p.waitForTimeout(120);};
  await p.goto(base+'?text=full');await p.waitForFunction(()=>window.game?.scene.isActive('TapToStartScene'));await tap(86,154);await p.waitForFunction(()=>window.game.scene.isActive('OfficeScene'));
  await p.evaluate(()=>window.game.scene.getScene('OfficeScene').handleStarterMemoInbox());
  await p.screenshot({path:`${out}/${d.library}-${mobile?'phone':'desktop'}-assignment.png`});assert(!(await p.evaluate(()=>JSON.parse(window.render_game_to_text()))).choice.title.includes("ASSIGNMENT DESK"));
  for(const row of [1,0]){await drain('OfficeScene');await choose('OfficeScene','choice',row);await drain('OfficeScene');}
  assert.equal((await progress()).compilerVolumeAssignment,index+1);assert.equal((await progress()).compilerSop_research,1);
  // Seed only the library destination; earn every new research receipt through controls.
  const librarySave=await p.evaluate(()=>JSON.parse(localStorage.getItem('rubyRuleFrusQuestSave')));
  librarySave.state.currentScene='PresidentialLibraryScene';librarySave.state.sceneProgress.libraryResearchActive=assignments.findIndex(a=>a.library===d.library);librarySave.state.sceneProgress.compilerLibraryReturn=1;
  await p.addInitScript(save=>{if(!sessionStorage.getItem('qa-library-seeded')){localStorage.setItem('rubyRuleFrusQuestSave',JSON.stringify(save));sessionStorage.setItem('qa-library-seeded','1');}},librarySave);await p.goto(base+'?text=full');await p.waitForFunction(()=>window.game.scene.isActive('TapToStartScene'));await tap(86,154);await p.waitForFunction(()=>window.game.scene.isActive('PresidentialLibraryScene'));await drain('PresidentialLibraryScene');
  for(const [station,[x,y]] of [[48,118],[202,118],[202,186],[48,186]].entries()){
    await place('PresidentialLibraryScene',x,y);await act();await p.waitForFunction(()=>window.game.scene.getScene('PresidentialLibraryScene').choice.active);
    await p.screenshot({path:`${out}/${d.library}-${mobile?'phone':'desktop'}-station${station}.png`});
    if(station===0){await choose('PresidentialLibraryScene','choice',1);await drain('PresidentialLibraryScene');assert.equal((await progress())[`libraryResearch_v2_${d.library}`]??0,0);await act();}
    await choose('PresidentialLibraryScene','choice',station%2);await drain('PresidentialLibraryScene');
    assert.equal((await progress())[`libraryResearch_v2_${d.library}`],station+1);
  }
  await choose('PresidentialLibraryScene','choice',0);await p.waitForFunction(()=>window.game.scene.isActive('ArchiveScene'));
  const final=await progress();assert.equal(final.compilerLibraryReturn,0);assert.equal(final.compilerSop_submission,undefined);
  await p.reload();await p.waitForFunction(()=>window.game.scene.isActive('TapToStartScene'));await tap(86,154);await p.waitForFunction(()=>window.game.scene.isActive('ArchiveScene'));assert.equal((await progress())[`libraryResearch_v2_${d.library}`],4);
  assert.deepEqual(errors,[]);results.push({library:d.library,mobile,legacyAssignmentIgnored:true,wrongAnswerRetried:true,packetFiled:true,returned:true,reloaded:true,errors});await p.close();
 }
 await writeFile(`${out}/result.json`,JSON.stringify(results,null,2));console.log(JSON.stringify(results));
}finally{await browser.close();}
