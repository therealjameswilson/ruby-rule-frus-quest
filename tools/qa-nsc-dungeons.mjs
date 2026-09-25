import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const base=process.env.FRUS_QA_URL??'http://127.0.0.1:5211/';const out=process.env.FRUS_QA_OUT??'/tmp/nsc-dungeons';await mkdir(out,{recursive:true});
const data=JSON.parse(await readFile('public/assets/research-world/nsc-holdings.json'));const assignments=JSON.parse(await readFile('public/assets/research-world/library-assignments.json')).assignments;
const browser=await chromium.launch({args:['--disable-audio-output']});
try{
 const seed=await browser.newPage();await seed.goto(new URL('?scene=PresidentialLibraryScene',base).href);await seed.waitForFunction(()=>localStorage.getItem('rubyRuleFrusQuestSave'));const template=await seed.evaluate(()=>JSON.parse(localStorage.getItem('rubyRuleFrusQuestSave')));await seed.close();
 for(const mobile of process.env.FRUS_QA_PHONE_ONLY?[true]:[false,true])for(const d of data.dungeons.filter(d=>!process.env.FRUS_QA_LIBRARIES||process.env.FRUS_QA_LIBRARIES.split(',').includes(d.library))){
  const saved=structuredClone(template);saved.state.currentScene='PresidentialLibraryScene';saved.state.sceneProgress={libraryResearchActive:assignments.findIndex(a=>a.library===d.library),['libraryBriefed_'+d.library]:1};saved.state.mode='explore';saved.state.activeDialog=null;saved.state.currentChoice=null;
  const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1024,height:960},isMobile:mobile,hasTouch:mobile,storageState:{cookies:[],origins:[{origin:new URL(base).origin,localStorage:[{name:'rubyRuleFrusQuestSave',value:JSON.stringify(saved)}]}]}});
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  const tap=async(x,y)=>{const r=await page.locator('canvas').first().boundingBox();if(mobile)await page.touchscreen.tap(r.x+x*r.width/256,r.y+y*r.height/240);else await page.mouse.click(r.x+x*r.width/256,r.y+y*r.height/240);};
  const act=async()=>{if(mobile)await tap(225,205);else await page.keyboard.press('Space');await page.waitForTimeout(190);};
  const drain=async()=>{for(let i=0;i<30;i++){if(!await page.evaluate(()=>window.game.scene.getScene('NscLibraryScene').dialog?.active))return;await act();}throw Error('Dialogue did not close');};
  const position=async(x,y,scene='NscLibraryScene')=>{await page.evaluate(({x,y,scene})=>window.game.scene.getScene(scene).player.setPosition(x,y),{x,y,scene});await page.waitForTimeout(100);};
  await page.goto(new URL('?text=full',base).href);await page.waitForFunction(()=>window.game?.scene.isActive('TapToStartScene'));if(mobile)await tap(86,154);else await page.keyboard.press('Enter');
  await page.waitForFunction(()=>window.game?.scene.isActive('PresidentialLibraryScene'));await page.waitForTimeout(350);
  await position(128,86,'PresidentialLibraryScene');await act();await page.waitForFunction(()=>window.game.scene.isActive('NscLibraryScene'));
  assert.equal(await page.evaluate(()=>window.game.scene.getScene('NscLibraryScene').dossier.library),d.library);
  for(let room=0;room<3;room++){
   await page.waitForFunction(r=>window.game.scene.getScene('NscLibraryScene').room===r,room);await page.waitForTimeout(250);
   if(d.library==='reagan')await page.screenshot({path:`${out}/${mobile?'phone':'desktop'}-room${room}.png`});
   await position(62,145);await act();assert(await page.evaluate(()=>window.game.scene.getScene('NscLibraryScene').dialog.active));await drain();
   // Wrong answers must not advance, then the real control selects the correct row.
   for(const wrong of (room===0?[true,false]:[false])){
    await position(194,145);await act();await page.waitForFunction(()=>window.game.scene.getScene('NscLibraryScene').choice.active);
    const row=wrong?1:room===1?1:0;
    const point=await page.evaluate(i=>{const r=window.game.scene.getScene('NscLibraryScene').choice.rows[i].getBounds();return {x:r.centerX,y:r.centerY};},row);
    if(room===1&&!wrong)await page.screenshot({path:`${out}/${d.library}-${mobile?'phone':'desktop'}-choice.png`});
    await tap(point.x,point.y);await page.waitForTimeout(200);await drain();
    const progress=await page.evaluate(id=>JSON.parse(localStorage.getItem('rubyRuleFrusQuestSave')).state.sceneProgress['nscResearch_'+id]??0,d.library);
    assert.equal(progress,wrong?0:room+1);
   }
   await position(128,86);await act();
  }
  await page.waitForFunction(()=>window.game.scene.isActive('PresidentialLibraryScene'));
  const finished=await page.evaluate(()=>JSON.parse(localStorage.getItem('rubyRuleFrusQuestSave')));assert.equal(finished.state.sceneProgress['nscResearch_'+d.library],3);assert.equal(finished.state.documentPoints,saved.state.documentPoints+6);
  // Reload from the saved lobby and enter the completed wing without earning twice.
  await page.reload();await page.waitForFunction(()=>window.game.scene.isActive('TapToStartScene'));if(mobile)await tap(86,154);else await page.keyboard.press('Enter');await page.waitForFunction(()=>window.game.scene.isActive('PresidentialLibraryScene'));
  assert.equal(await page.evaluate(id=>JSON.parse(localStorage.getItem('rubyRuleFrusQuestSave')).state.sceneProgress['nscResearch_'+id],d.library),3);
  assert.deepEqual(errors,[]);console.log(JSON.stringify({library:d.library,mobile,rooms:3,wrongAnswerRecovered:true,saved:true,returned:true,errors}));await page.close();
 }
 const doc=await browser.newPage();await doc.goto(new URL('assets/research-world/nsc-research.html',base).href);await doc.waitForFunction(()=>document.querySelectorAll('article').length===11);assert.equal(await doc.locator('article a').count(),11);await doc.close();
}finally{await browser.close();}
