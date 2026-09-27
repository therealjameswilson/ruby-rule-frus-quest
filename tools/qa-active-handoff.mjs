import {completeRevisionDesk} from './revision-desk-actions.mjs';
import {completeChapterDesk} from './chapter-desk-actions.mjs';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const base=process.env.FRUS_QA_URL??'http://127.0.0.1:5218/';const out='/tmp/frus-active-handoff';await mkdir(out,{recursive:true});
const b=await chromium.launch();const results=[];
try{
 const seed=await b.newPage();await seed.goto(base+'?scene=PresidentialLibraryScene');await seed.waitForFunction(()=>localStorage.getItem('rubyRuleFrusQuestSave'));const template=await seed.evaluate(()=>JSON.parse(localStorage.getItem('rubyRuleFrusQuestSave')));await seed.close();
 for(const ready of [false,true]){
  const saved=structuredClone(template);saved.state.currentScene='ArchiveScene';saved.state.mode='explore';saved.state.activeDialog=null;saved.state.currentChoice=null;saved.state.processStamps=['rule'];
  saved.state.sceneProgress={compilerSopVersion:1,compilerVolumeAssignment:3,compilerSop_plan:1,compilerSop_research:1,archiveSourceRoomComplete:1,repositoryCoverageMapComplete:1,...(ready?{libraryResearch_v2_clinton:4}:{})};
  const p=await b.newPage({viewport:{width:1024,height:960},storageState:{cookies:[],origins:[{origin:new URL(base).origin,localStorage:[{name:'rubyRuleFrusQuestSave',value:JSON.stringify(saved)}]}]}});const errors=[];p.on('pageerror',e=>errors.push(String(e)));
  const tap=async(x,y)=>{const r=await p.locator('canvas').first().boundingBox();await p.mouse.click(r.x+x*r.width/256,r.y+y*r.height/240);};
  const state=()=>p.evaluate(()=>JSON.parse(window.render_game_to_text()));
  const drain=async()=>{for(let i=0;i<100;i++){if((await state()).mode!=='dialog')return;await p.keyboard.press('Space');await p.waitForTimeout(110);}assert.fail('dialog stuck');};
  const choose=async(value)=>{await p.waitForFunction(()=>window.game.scene.getScene('ArchiveScene').researchChoice.active);await p.waitForTimeout(220);const point=await p.evaluate(value=>{const choice=window.game.scene.getScene('ArchiveScene').researchChoice;const i=choice.options.findIndex(o=>o.value===value);if(i<0)throw Error('Missing '+value);const r=choice.rows[i].getBounds();return{x:r.centerX,y:r.centerY};},value);await tap(point.x,point.y);await p.waitForTimeout(100);};
  await p.goto(base+'?text=full');await p.waitForFunction(()=>window.game?.scene.isActive('TapToStartScene'));await tap(86,154);await p.waitForFunction(()=>window.game.scene.isActive('ArchiveScene'));await drain();await p.waitForTimeout(700);
  await p.evaluate(()=>window.game.scene.getScene('ArchiveScene').player.setPosition(248,120));await p.keyboard.down('ArrowRight');await p.waitForTimeout(150);await p.keyboard.up('ArrowRight');await p.waitForTimeout(200);
  {
   await p.waitForSelector('.manuscript-desk');await p.locator('[data-packet=decision]').click();await p.locator('.manuscript-submit').click();
   await drain();await completeChapterDesk(p);
   for(const value of ['retain','second','revise','clear','joint','handoff']){await drain();if(value==='second')await p.screenshot({path:out+'/second-review.png'});if(value==='revise')await completeRevisionDesk(p);else await choose(value);await drain();}
   const done=await p.evaluate(()=>JSON.parse(localStorage.getItem('rubyRuleFrusQuestSave')));assert.equal(done.state.sceneProgress.compilerSop_submission,1);assert(!done.state.sceneProgress.finalGatePublished);await p.screenshot({path:out+'/dpd-ready.png'});
   await p.evaluate(()=>window.game.scene.getScene('ArchiveScene').player.setPosition(248,120));await p.keyboard.down('ArrowRight');await p.waitForFunction(()=>window.game.scene.isActive('NetworkScene'));await p.keyboard.up('ArrowRight');
  }
  assert.deepEqual(errors,[]);results.push({ready,handoffWithoutLibraryRequirement:true,errors});await p.close();
 }
 await writeFile(out+'/result.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results));
}finally{await b.close();}
