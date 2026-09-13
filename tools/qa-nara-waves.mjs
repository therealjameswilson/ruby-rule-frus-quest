const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { workstationWalkRoute } from '../src/game/workstationGeometry.ts';
const out=process.env.FRUS_QA_OUT ?? '/private/tmp/frus-nara-waves'; await mkdir(out,{recursive:true});
const browser=await chromium.launch({...(process.env.CHROMIUM_EXECUTABLE ? { executablePath: process.env.CHROMIUM_EXECUTABLE } : {})});
const page=await browser.newPage({viewport:{width:1024,height:960}});
const errors=[];page.on('pageerror',e=>errors.push(String(e)));
const state=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
async function shot(name) {
 const image=await page.evaluate(()=>new Promise(r=>window.game.renderer.snapshot(i=>r(i.src))));
 await writeFile(`${out}/${name}.png`,Buffer.from(image.split(',')[1],'base64'));
}
async function step(targets,enemy) {
 const s=await state();
 const geometry=await page.evaluate(()=>{const scene=window.game.scene.getScene('GameplayMapScene');return {player:{x:scene.player.logicalX,y:scene.player.logicalY},solids:scene.solids.map(({x,y,width,height})=>({x,y,width,height}))};});
 s.player=geometry.player;
 const solids=geometry.solids;
 const aisles={x:[s.player.x,...targets.map(t=>t.x),...solids.flatMap(r=>[r.x-10,r.x+r.width+10])].filter(x=>x>12&&x<244),
 y:[s.player.y,...targets.map(t=>t.y),...solids.flatMap(r=>[r.y-7,r.y+r.height+5])].filter(y=>y>40&&y<210)};
 const routes=targets.map(t=>workstationWalkRoute(s.player,t,solids,aisles)).filter(r=>r.length);
 routes.sort((a,b)=>a.length-b.length);
 const close=enemy&&Math.hypot(enemy.x-s.player.x,enemy.y-s.player.y)<29;
 const target=close?enemy:routes[0]?.find(p=>Math.hypot(p.x-s.player.x,p.y-s.player.y)>2);
 if(!target) throw Error(`No route: ${JSON.stringify({player:s.player,targets})}`);
 const dx=target.x-s.player.x,dy=target.y-s.player.y;
 const key=Math.abs(dx)>Math.abs(dy)?dx>0?'ArrowRight':'ArrowLeft':dy>0?'ArrowDown':'ArrowUp';
 await page.keyboard.down(key);await page.waitForTimeout(60);
 if(close&&s.playerCombat.weapon.canSwing) await page.keyboard.press('x',{delay:35});
 await page.keyboard.up(key);await page.waitForTimeout(150);
}
try {
 await page.goto('http://127.0.0.1:5195/?scene=GameplayMapScene&map=nara_stacks&give=combat-tools&equip=review_folder&text=full');
 await page.waitForFunction(()=>window.render_game_to_text && JSON.parse(window.render_game_to_text()).scene==='GameplayMapScene');
 await page.waitForTimeout(1200);const before=await state();let changedTool=false;
 let checkpointVerified=false;
 await shot('entry');
 for(let i=0;i<500;i++) {
  const s=await state();if(s.danneCombat.roomClear.cleared)break;
  assert.equal(s.mode,'explore');
  const e=s.visibleThreats.find(t=>t.hp>0);if(!e){await page.waitForTimeout(150);continue;}
  if(e.weakness==='citation_stamp'&&!changedTool) {
   if(process.env.FRUS_QA_RETREAT==='1'&&!checkpointVerified) {
    const points=s.documentPoints;
    for(let j=0;j<150;j++) {
      if((await state()).nearestInteractable==='Freight Elevator Exit')break;
      const door=await page.evaluate(()=>{const d=window.game.scene.getScene('GameplayMapScene').doors.find(d=>d.id==='world_exit');return {x:d.x,y:d.y,radius:d.radius};});
      await step([{x:door.x,y:door.y-door.radius+2}]);
    }
    assert.equal((await state()).nearestInteractable,'Freight Elevator Exit');
    await page.keyboard.press('Space',{delay:40});
    await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).scene==='WorldMapScene');
    await page.waitForTimeout(400);
    for(let j=0;j<8;j++) {
      if(await page.evaluate(()=>window.game.scene.getScene('WorldMapScene').selectedDistrictNumber===3))break;
      await page.keyboard.press('ArrowDown',{delay:50});await page.waitForTimeout(100);
    }
    await page.keyboard.press('Space',{delay:40});
    await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).scene==='GameplayMapScene');
    await page.waitForTimeout(1200);
    const resumed=await state();
    assert.equal(resumed.documentPoints,points);
    assert.equal(resumed.danneCombat.activeEnemyCount,1);
    assert.equal(resumed.danneCombat.roomClear.defeated,1);
    assert.equal(resumed.danneCombat.roomClear.required,2);
    assert.equal(resumed.danneCombat.roomClear.cleared,false);
    assert.equal(resumed.visibleThreats.find(t=>t.hp>0).weakness,'citation_stamp');
    await shot('checkpoint-resumed');
    checkpointVerified=true;
   }
   await shot('second-wave');await page.keyboard.press('m',{delay:40});
   await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).mode==='pause');
   const r=await page.locator('canvas').first().boundingBox();
   await page.mouse.click(r.x+r.width*48/256,r.y+r.height*80/240);
   await shot('confirm-tool');
   await page.waitForTimeout(120);
   await page.mouse.click(r.x+r.width*48/256,r.y+r.height*80/240);
   await page.keyboard.press('Escape',{delay:40});
   await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).mode==='explore');
   changedTool=true;continue;
  }
  await step([{x:e.x,y:e.y+20},{x:e.x+24,y:e.y},{x:e.x-24,y:e.y},{x:e.x,y:e.y-20}],e);
 }
 const cleared=await state();await shot('cleared');
 assert(cleared.danneCombat.roomClear.cleared,'Both waves must clear');assert(changedTool);
 await page.waitForTimeout(1300);
 const handoff=await state();
 assert.equal(handoff.objective,'TO CATALOG DESK');
 assert.equal(await page.evaluate(()=>window.game.scene.getScene('UIScene').questBandText.text),'TO CATALOG DESK');
 if(!handoff.nearestInteractable)assert.equal(await page.evaluate(()=>window.game.scene.getScene('UIScene').questBandCueText.text),'EXPLORE OPEN ROUTES');
 await shot('exploration-handoff');
 if(process.env.FRUS_QA_RETREAT==='1')assert(checkpointVerified,'Must exercise physical retreat and checkpoint re-entry');
 assert.deepEqual(cleared.documentCandidates,before.documentCandidates);
 assert.deepEqual(cleared.standardsViolations,before.standardsViolations);
 await writeFile(`${out}/cleared.json`,JSON.stringify(cleared,null,2));
 for(let i=0;i<150;i++) {
   const s=await state();if(s.nearestInteractable==='Freight Elevator Exit')break;
   const door=await page.evaluate(()=>{const d=window.game.scene.getScene('GameplayMapScene').doors.find(d=>d.id==='world_exit');return {x:d.x,y:d.y,radius:d.radius};});
   await step([{x:door.x,y:door.y-door.radius+2}]);
 }
 await page.keyboard.press('Space',{delay:40});
 await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).scene==='WorldMapScene');
 await page.waitForTimeout(350);
 await shot('exit');assert.deepEqual(errors,[]);
 console.log('NARA two waves, menu tool swap, record invariants and exit pass. Debug-granted tools.');
} finally {
 await writeFile(`${out}/last.json`,JSON.stringify(await state(),null,2));await shot('last');
 await browser.close();
}
