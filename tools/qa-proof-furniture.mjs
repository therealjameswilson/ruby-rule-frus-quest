import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { workstationWalkRoute, workstationFeetBlocked } from '../src/game/workstationGeometry.ts';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const out=process.env.FRUS_QA_OUT??'/tmp/frus-proof-furniture';
const mobile=process.argv.includes('--mobile'),fallback=process.argv.includes('--fallback');
const legacy=process.argv.includes('--legacy');
assert(process.env.FRUS_QA_STORAGE,'Supply an earned Editor or proof-room save');
await mkdir(out,{recursive:true});
const storage=JSON.parse(await readFile(process.env.FRUS_QA_STORAGE,'utf8'));
const saveEntry=storage.origins.flatMap(o=>o.localStorage).find(e=>e.name==='rubyRuleFrusQuestSave');
const save=JSON.parse(saveEntry.value);
if(legacy) {
  // Position-only regression fixture observed in the old build, not a progress grant.
  save.state.player={x:192,y:167};
  saveEntry.value=JSON.stringify(save);
}
const earned=s=>({points:s.documentPoints,inventory:s.inventory,documents:s.documentCandidates,
  step:s.sceneProgress.silentReadReviewStep,status:s.sceneProgress.silentReadReviewStatus});
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE}:{})});
const context=await browser.newContext({storageState:storage,viewport:mobile?{width:375,height:667}:{width:1024,height:960},
  hasTouch:mobile,isMobile:mobile,deviceScaleFactor:mobile?3:1});
const page=await context.newPage(),cdp=await context.newCDPSession(page),errors=[];
page.on('pageerror',e=>errors.push(String(e)));
page.on('console',m=>{if(m.type()==='error'&&!(fallback&&m.text().includes('net::ERR_FAILED')))errors.push(m.text());});
if(fallback)await page.route('**/tileset_interiors_16x16_native.png',r=>r.abort());
const state=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
const geometry=()=>page.evaluate(()=>{const s=window.game.scene.getScene('SilentReadScene');return {
  feet:{x:s.player.logicalX,y:s.player.logicalY},solids:s.roomSolids.map(({x,y,width,height})=>({x,y,width,height}))};});
async function touch(x,y,dx=0,dy=0,ms=50) {
  const b=await page.locator('canvas').first().boundingBox(),p=(x,y)=>({x:b.x+x*b.width/256,y:b.y+y*b.height/240,id:1});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[p(x,y)]});
  if(dx||dy)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[p(x+dx,y+dy)]});
  await page.waitForTimeout(ms);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
}
async function direction(key,ms=65) {
  if(mobile){const [dx,dy]={ArrowUp:[0,-26],ArrowDown:[0,26],ArrowLeft:[-26,0],ArrowRight:[26,0]}[key];await touch(48, 202,dx,dy,ms);}
  else{await page.keyboard.down(key);await page.waitForTimeout(ms);await page.keyboard.up(key);}
  await page.waitForTimeout(20);
}
async function move(x,y) {
  for(let i=0;i<220;i++) {
    const {feet,solids}=await geometry();
    if(Math.hypot(x-feet.x,y-feet.y)<4)return;
    const route=workstationWalkRoute(feet,{x,y},solids,{x:[28,96,160,228],y:[80,132,184,198]});
    const next=route.find(p=>Math.hypot(p.x-feet.x,p.y-feet.y)>2)??route.at(-1);
    assert(next,`No route ${JSON.stringify(feet)} -> ${x},${y}`);
    const dx=next.x-feet.x,dy=next.y-feet.y;
    await direction(Math.abs(dx)>Math.abs(dy)?dx>0?'ArrowRight':'ArrowLeft':dy>0?'ArrowDown':'ArrowUp');
  }
  throw Error(`Movement timeout ${x},${y}`);
}
async function shot(name) {
  const s=await state();
  const src=await page.evaluate(()=>new Promise(resolve=>window.game.renderer.snapshot(i=>resolve(i.src))));
  await writeFile(`${out}/${name}-native.png`,Buffer.from(src.split(',')[1],'base64'));
  await page.screenshot({path:`${out}/${name}.png`});await writeFile(`${out}/${name}.json`,JSON.stringify(s,null,2));
  console.log(name,JSON.stringify({player:s.player,points:s.documentPoints,reliability:s.reliability}));
  return s;
}
try {
  await page.goto(`${process.env.FRUS_QA_URL??'http://127.0.0.1:5195/'}?text=full`);
  await page.waitForFunction(()=>window.render_game_to_text&&JSON.parse(window.render_game_to_text()).scene==='TapToStartScene');
  if(mobile)await touch(86,154);else await page.keyboard.press('Enter',{delay:50});
  await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).scene==='SilentReadScene');
  await page.waitForTimeout(120);
  const initial=await shot('entry');
  assert.equal(initial.sceneProgress.silentReadReviewStep,save.state.sceneProgress.silentReadReviewStep);
  assert.equal(initial.documentPoints,save.state.documentPoints);
  const g=await geometry();assert(!workstationFeetBlocked(g.feet,g.solids));
  if(legacy)assert(Math.hypot(g.feet.x-192,g.feet.y-167)<=7,'Recover only to nearby floor');
  await page.evaluate(()=>{const s=window.game.scene.getScene('SilentReadScene');window.proofPatrolContacts=[];window.proofPatrolSeen=new Set();
    s.events.on('postupdate',()=>{const b=s.danneLurker.bodyBounds();window.proofPatrolSeen.add(s.danneLurker.waypointIndex);
      for(const r of s.roomSolids)if(b.x<=r.right&&b.right>=r.x&&b.y<=r.bottom&&b.bottom>=r.y)
        window.proofPatrolContacts.push({x:b.x,y:b.y,solid:{x:r.x,y:r.y}});
    });
  });
  const desks=await page.evaluate(()=>window.game.scene.getScene('SilentReadScene').children.list
    .filter(o=>o.name?.startsWith('proof-desk-')).map(o=>({name:o.name,x:o.x,y:o.y,depth:o.depth})));
  assert(desks.length>=1);
  for(const desk of desks) {
    assert.equal(desk.depth,desk.y+8);
    await move(desk.x,desk.y+20);await direction('ArrowUp',450);
    const {feet,solids}=await geometry();assert(!workstationFeetBlocked(feet,solids));
    assert(feet.y>desk.y+11,'The solid must stop walking through the desk');
    assert(await page.evaluate(depth=>window.game.scene.getScene('SilentReadScene').player.sprite.depth>depth,desk.depth));
    assert(await page.evaluate(()=>{const s=window.game.scene.getScene('SilentReadScene');return s.interactionPrompt.ring.depth<s.player.sprite.depth;}));
    assert(await page.evaluate(({x,y})=>window.game.scene.getScene('SilentReadScene').danneLurker.boltBlocked(x,y),desk));
    await shot(desk.name+'-front');
    await move(desk.x,desk.y-20);
    assert(await page.evaluate(depth=>window.game.scene.getScene('SilentReadScene').player.sprite.depth<depth,desk.depth));
    await shot(desk.name+'-behind');
  }
  await move(28,80);
  await page.waitForFunction(()=>window.proofPatrolSeen.size===9,null,{timeout:70000});
  const patrol=await page.evaluate(()=>({seen:[...window.proofPatrolSeen],contacts:window.proofPatrolContacts}));
  await writeFile(`${out}/patrol.json`,JSON.stringify(patrol,null,2));assert.deepEqual(patrol.contacts,[]);
  assert.deepEqual(earned(await state()),earned(initial));
  if(fallback)assert.equal(await page.evaluate(()=>window.game.textures.exists('pack-tiles-interiors-native')),false);
  await shot('verified');
  assert.deepEqual(errors,[]);
}catch(error){await shot('failure').catch(()=>{});throw error;}
finally{await writeFile(`${out}/errors.json`,JSON.stringify(errors,null,2));await browser.close();}
