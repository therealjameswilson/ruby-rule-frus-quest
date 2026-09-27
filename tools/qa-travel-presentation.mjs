import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const out='/tmp/frus-travel-presentation';await mkdir(out,{recursive:true});
const browser=await chromium.launch();const results=[];
try {
 for(const [target,library,reduced] of [['PresidentialLibraryScene','reagan',false],['PresidentialLibraryScene','bush41',false],['PresidentialLibraryScene','clinton',false],['PresidentialLibraryScene','bush43',false],['NscLibraryScene','bush43',true],['ResearchWorldScene','reagan',false]]){
  const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:reduced?'reduce':'no-preference'});const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('http://127.0.0.1:5217/?scene=OfficeScene');await page.waitForFunction(()=>window.game?.scene.isActive('OfficeScene'));await page.waitForSelector('#boot-loader',{state:'hidden'});
  const copy=await page.evaluate(async({target,library})=>{
   const {gameState}=await import('/src/game/state.ts');const {LIBRARY_ASSIGNMENTS}=await import('/src/game/libraryResearch.ts');
   gameState.sceneProgress.libraryResearchActive=LIBRARY_ASSIGNMENTS.findIndex(a=>a.library===library);gameState.sceneProgress.researchWorldZone=6;
   const {travelPresentation}=await import('/src/game/travelPresentation.ts');const copy=travelPresentation(target,gameState.sceneProgress);
   const {transitionTo}=await import('/src/systems/sceneTransitions.ts');const scene=window.game.scene.getScene('OfficeScene');
   // Hold only the covered card for inspection; release to test the real destination below.
   scene.time.paused=true;transitionTo(scene,target);return copy;
  },{target,library});
  await page.waitForTimeout(300);
  const layout=await page.evaluate(()=>{const scene=window.game.scene.getScene('OfficeScene'),overlay=scene.children.list.find(x=>x.depth===5000);return overlay.list.filter(x=>x.type==='Text').map(x=>({text:x.text,x:x.getBounds().x,right:x.getBounds().right,y:x.getBounds().y,bottom:x.getBounds().bottom}));});
  assert.equal(layout[0].text,copy.title);assert.equal(layout[1].text,copy.caption);
  for(const text of layout){assert(text.x>=8&&text.right<=248,JSON.stringify(text));}assert(layout[0].bottom<layout[1].y);
  await page.screenshot({path:`${out}/${target}-${library}.png`});
  await page.evaluate(()=>{window.game.scene.getScene('OfficeScene').time.paused=false;});
  await page.waitForFunction(target=>window.game.scene.isActive(target),target);await page.waitForTimeout(350);
  assert.equal(await page.evaluate(target=>window.game.scene.getScene(target).cameras.main.fadeEffect.isRunning,target),false);
  assert.deepEqual(errors,[]);results.push({target,library,reduced,copy,layout,errors});await page.close();
 }
 await writeFile(out+'/result.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results));
}finally{await browser.close();}
