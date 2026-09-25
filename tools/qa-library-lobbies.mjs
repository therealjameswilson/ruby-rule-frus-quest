import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const base=process.env.FRUS_QA_URL??'http://127.0.0.1:5211/';const out='/tmp/library-lobbies';await mkdir(out,{recursive:true});
const assignments=JSON.parse(await readFile('public/assets/research-world/library-assignments.json')).assignments;
const browser=await chromium.launch({args:['--disable-audio-output']});
try{
 const seed=await browser.newPage();await seed.goto(new URL('?scene=PresidentialLibraryScene',base).href);await seed.waitForFunction(()=>localStorage.getItem('rubyRuleFrusQuestSave'));const template=await seed.evaluate(()=>JSON.parse(localStorage.getItem('rubyRuleFrusQuestSave')));await seed.close();
 for(let i=0;i<assignments.length;i++){
  const id=assignments[i].library,saved=structuredClone(template);saved.state.currentScene='PresidentialLibraryScene';saved.state.sceneProgress={libraryResearchActive:i,['libraryBriefed_'+id]:1};saved.state.mode='explore';saved.state.activeDialog=null;
  const p=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,storageState:{cookies:[],origins:[{origin:new URL(base).origin,localStorage:[{name:'rubyRuleFrusQuestSave',value:JSON.stringify(saved)}]}]}});const errors=[];p.on('pageerror',e=>errors.push(String(e)));
  await p.goto(new URL('?text=full',base).href);await p.waitForFunction(()=>window.game?.scene.isActive('TapToStartScene'));const r=await p.locator('canvas').first().boundingBox();await p.touchscreen.tap(r.x+86*r.width/256,r.y+154*r.height/240);
  await p.waitForFunction(()=>window.game.scene.isActive('PresidentialLibraryScene'));await p.waitForTimeout(250);
  const info=await p.evaluate(()=>{const s=window.game.scene.getScene('PresidentialLibraryScene');const source=s.children.list.find(o=>o.text==='SOURCES');const a=s.player.sprite.getBounds(),b=source.getBounds();return {id:s.assignment.library,desks:s.children.list.filter(o=>o.name.startsWith('library-desk-')&&o.texture.key==='research-props-v1').length,floor:!!s.children.getByName('editorial-carpet-floor'),walls:!!s.children.getByName('editorial-walls'),sourceClear:b.bottom<a.top||b.top>a.bottom||b.left>a.right||b.right<a.left};});
  assert.equal(info.id,id);assert.equal(info.desks,4);assert(info.floor&&info.walls&&info.sourceClear);assert.deepEqual(errors,[]);
  if(['fdr','reagan','eisenhower'].includes(id))await p.screenshot({path:`${out}/${id}-phone.png`});console.log(JSON.stringify({...info,errors}));await p.close();
 }
}finally{await browser.close();}
