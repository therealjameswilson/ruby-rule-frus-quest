import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const out=process.env.FRUS_QA_OUT??'/tmp/library-clearance';await mkdir(out,{recursive:true});
const b=await chromium.launch({args:['--disable-audio-output']});const results=[];
try{for(const reduced of [false,true]){
 const p=await b.newPage({reducedMotion:reduced?'reduce':'no-preference'}),errors=[];p.on('pageerror',e=>errors.push(String(e)));
 await p.goto('http://127.0.0.1:5211/?scene=PresidentialLibraryScene');await p.waitForFunction(()=>window.game?.scene.isActive('PresidentialLibraryScene'));
 for(let i=0;i<60&&await p.evaluate(()=>window.game.scene.getScene('PresidentialLibraryScene').dialog.active);i++){await p.keyboard.press('Space');await p.waitForTimeout(110);}
 // Invoke the real research choice, freeze the loop, and advance animation deterministically.
 await p.evaluate(()=>window.game.scene.getScene('PresidentialLibraryScene').research(0));await p.waitForTimeout(300);
 const result=await p.evaluate(()=>{
  const s=window.game.scene.getScene('PresidentialLibraryScene');window.game.loop.sleep();s.choice.choose('A');
  const initial={visible:s.barriers[0].visible,count:s.clearing.length,progress:JSON.parse(localStorage.getItem('rubyRuleFrusQuestSave')).state.sceneProgress.libraryResearch_reagan};
  s.update(0,80);const mid={x:s.barriers[0].x,alpha:s.barriers[0].alpha};
  s.clearanceQaUpdate=s.sys.sceneUpdate;s.sys.sceneUpdate=()=>{};window.game.loop.wake();
  return {initial,mid};
 });
 await p.waitForTimeout(100);await p.screenshot({path:`${out}/${reduced?'reduced':'moving'}.png`});
 Object.assign(result,await p.evaluate(()=>{
  const s=window.game.scene.getScene('PresidentialLibraryScene');window.game.loop.sleep();s.sys.sceneUpdate=s.clearanceQaUpdate;
  s.inventory.toggle();s.update(0,500);const paused={x:s.barriers[0].x,alpha:s.barriers[0].alpha};s.inventory.toggle();s.update(0,160);
  return {paused,final:{visible:s.barriers[0].visible,count:s.clearing.length},otherBarrierVisible:s.barriers[1].visible};
 }));
 assert.equal(result.initial.progress,1);assert.equal(result.initial.visible,!reduced);assert.equal(result.initial.count,reduced?0:1);assert.deepEqual(result.mid,result.paused);assert.deepEqual(result.final,{visible:false,count:0});assert(result.otherBarrierVisible);
 if(!reduced){assert(result.mid.x<128&&result.mid.x>120);assert(result.mid.alpha>0&&result.mid.alpha<1);}
 assert.deepEqual(errors,[]);results.push({reduced,...result,errors});await p.close();
}}finally{await b.close();}
await writeFile(`${out}/result.json`,JSON.stringify(results,null,2));console.log(JSON.stringify(results));
