import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const base=process.env.FRUS_QA_URL??'http://127.0.0.1:5232/';
const out=process.env.FRUS_QA_OUT??'/tmp/frus-floor-hierarchy';
await mkdir(out,{recursive:true});
const browser=await chromium.launch(),rows=[],errors=[];
try{
 for(const [layout,width,height] of [['phone',375,667],['landscape',844,390],['desktop',1024,960]]){
 const page=await browser.newPage({viewport:{width,height},hasTouch:layout!=='desktop',isMobile:layout!=='desktop'});
 page.on('pageerror',e=>errors.push(String(e)));
 await page.goto(new URL('?scene=GameplayMapScene&map=frus_floor',base).href);
 await page.waitForFunction(()=>window.game?.scene.isActive('GameplayMapScene'));
 await page.waitForTimeout(1100);
 for(let completed=0;completed<=5;completed++){
  const row=await page.evaluate(completed=>{
   const scene=window.game.scene.getScene('GameplayMapScene');
   const context=Object.fromEntries(['citationStamp','selectionReady','clearanceReady','editorialReady','buckramReady'].map((key,i)=>[key,i<completed]));
   // Presentation fixture only: no inventory/save/mission mutation.
   scene.frusFloorGateContext=()=>context;
   scene.updateFrusFloorGateStatus(true);
   scene.updateFrusFloorNextGateRoute(true);
   scene.updateFrusFloorNextGateInteractable(true);
   const objects=scene.children.list;
   const one=name=>objects.find(o=>o.name===name);
   const box=o=>{const b=o.getBounds();return{x:b.x,y:b.y,width:b.width,height:b.height};};
   return{count:one('frus-production-gate-count-label').text,next:one('frus-production-next-gate-label').text,
    prompt:scene.prompt.container.visible?box(scene.prompt.border):null,
    obsoleteTitle:!!one('frus-production-flow-title'),
    card:box(one('frus-production-gate-count-card')),label:box(one('frus-production-next-gate-label')),
    statuses:objects.filter(o=>o.name==='frus-production-gate-status-light').map(o=>o.getData('gateStatus')),
    clutter:objects.filter(o=>['frus-production-current-task-card','frus-production-current-stage-card','frus-production-next-gate-card','frus-production-ready-gate-card'].includes(o.name)).length,
    flowVisible:scene.snesFlowPlaque.some(o=>o.visible)};
  },completed);
  assert.equal(row.count,`${completed}/5`);assert.equal(row.statuses.filter(s=>s==='complete').length,completed);
  assert.equal(row.obsoleteTitle,false);
  if(row.prompt)assert(row.prompt.y+row.prompt.height<row.card.y, "Action marker must stay above progress banner");
  assert.equal(row.clutter,0);assert.equal(row.flowVisible,false);
  assert(row.label.x>=row.card.x && row.label.x+row.label.width<=row.card.x+row.card.width,`label overflows: ${row.next}`);
  assert.equal(row.next,['NEXT: VERIFY SOURCES','NEXT: SELECT RECORDS','NEXT: REVIEW EQUITIES','NEXT: CHECK ANNOTATION','NEXT: BIND THE VOLUME','TO PUBLICATION GATE'][completed]);
  await page.screenshot({path:`${out}/${layout}-${completed}.png`});
  rows.push({layout,completed,...row});
 }
 await page.close();
 }
 assert.deepEqual(errors,[]);await writeFile(`${out}/result.json`,JSON.stringify({scope:'18 presentation fixtures; not earned progression',rows,errors},null,2));
 console.log(JSON.stringify({cases:rows.length,errors}));
}finally{await browser.close();}
