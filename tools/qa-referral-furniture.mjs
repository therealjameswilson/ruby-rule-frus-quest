import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { REFERRAL_PATROL, referralWalkRoute, referralDeskBounds, referralFeetBlocked } from '../src/game/referralFurniture.ts';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const base = process.env.FRUS_QA_URL ?? 'http://127.0.0.1:5195/';
const out = process.env.FRUS_QA_OUT ?? '/tmp/frus-referral-furniture';
const baseline = process.argv.includes('--baseline'), mobile = process.argv.includes('--mobile'), fallback = process.argv.includes('--fallback');
assert(process.env.FRUS_QA_STORAGE, 'Provide an earned Referral entry');
await mkdir(out, {recursive:true});
const browser = await chromium.launch({headless:true,
  ...(process.env.CHROMIUM_EXECUTABLE ? {executablePath:process.env.CHROMIUM_EXECUTABLE} : {})});
const context = await browser.newContext({storageState:JSON.parse(await readFile(process.env.FRUS_QA_STORAGE,'utf8')),
  viewport:mobile?{width:375,height:667}:{width:1024,height:960},hasTouch:mobile,isMobile:mobile,deviceScaleFactor:mobile?3:1});
const page=await context.newPage(),cdp=await context.newCDPSession(page),errors=[];
page.on('pageerror',error=>errors.push(String(error)));
page.on('console',message=>{if(message.type()==='error'&&!(fallback&&message.text().includes('net::ERR_FAILED')))errors.push(message.text());});
if(fallback) await page.route('**/tileset_interiors_16x16_native.png',route=>route.abort());
const state=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
const solids=()=>page.evaluate(()=>window.game.scene.getScene('ReferralVaultScene').roomSolids.map(({x,y,width,height})=>({x,y,width,height})));
const feet=()=>page.evaluate(()=>{const p=window.game.scene.getScene('ReferralVaultScene').player;return {x:p.logicalX,y:p.logicalY};});
async function touch(x,y,dx=0,dy=0,ms=48) {
  const b=await page.locator('canvas').first().boundingBox();
  const point=(x,y)=>({x:b.x+x*b.width/256,y:b.y+y*b.height/240,id:1});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point(x,y)]});
  if(dx||dy) await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[point(x+dx,y+dy)]});
  await page.waitForTimeout(ms);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
}
async function press(key) {
  if(mobile) await touch(...(key==='Enter'?[86,154]:[225,205]));
  else await page.keyboard.press(key,{delay:48});
  await page.waitForTimeout(120);
}
async function direction(key,ms=65) {
  if(mobile) {const [dx,dy]={ArrowLeft:[-26,0],ArrowRight:[26,0],ArrowUp:[0,-26],ArrowDown:[0,26]}[key];await touch(40,178,dx,dy,ms);}
  else {await page.keyboard.down(key);await page.waitForTimeout(ms);await page.keyboard.up(key);}
  await page.waitForTimeout(20);
}
async function move(x,y) {
  for(let i=0;i<180;i++) {
    const p=baseline?(await state()).player:await feet();
    if(Math.hypot(x-p.x,y-p.y)<3)return;
    const route=baseline?[{x,y}]:referralWalkRoute(p,{x,y},await solids());
    const target=route.find(point=>Math.hypot(point.x-p.x,point.y-p.y)>1);
    assert(target,`No aisle from ${JSON.stringify(p)} to ${x},${y}`);
    const dx=target.x-p.x,dy=target.y-p.y;
    await direction(Math.abs(dx)>Math.abs(dy)?dx>0?'ArrowRight':'ArrowLeft':dy>0?'ArrowDown':'ArrowUp');
  }
  throw new Error(`Movement timeout toward ${x},${y}: ${JSON.stringify((await state()).player)}`);
}
async function shot(name) {
  const s=await state();
  const image=await page.evaluate(()=>new Promise(resolve=>window.game.renderer.snapshot(img=>resolve(img.src))));
  await writeFile(`${out}/${name}-native.png`,Buffer.from(image.split(',')[1],'base64'));
  await page.screenshot({path:`${out}/${name}.png`});
  await writeFile(`${out}/${name}.json`,JSON.stringify(s,null,2));
  console.log(name,JSON.stringify({player:s.player,scene:s.scene,held:s.heldItem,rel:s.reliability}));
  return s;
}
try {
  await page.goto(`${base}?text=full`);
  await page.waitForFunction(()=>window.render_game_to_text&&JSON.parse(window.render_game_to_text()).scene==='TapToStartScene');
  await press('Enter');
  await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).scene==='ReferralVaultScene');
  await page.waitForTimeout(600);
  const initial=await shot('entry');
  if(baseline) {
    await move(30,150);await move(60,150);await move(60,130);
    const inside=await shot('inside-cia-before');
    assert(referralFeetBlocked(inside.player,[referralDeskBounds(60,130)]));
    await page.reload();
    await page.waitForFunction(()=>window.render_game_to_text&&JSON.parse(window.render_game_to_text()).scene==='TapToStartScene');
    await context.storageState({path:`${out}/legacy-desk-storage.json`});
  } else {
    await page.evaluate(()=>{const scene=window.game.scene.getScene('ReferralVaultScene');window.patrolSolidContacts=[];window.patrolWaypoints=new Set();
      scene.events.on('postupdate',()=>{const body=scene.danneLurker.bodyBounds();
        window.patrolWaypoints.add(scene.danneLurker.waypointIndex);
        for(const rect of scene.roomSolids) {
          if(body.x<=rect.right&&body.right>=rect.x&&body.y<=rect.bottom&&body.bottom>=rect.y)
            window.patrolSolidContacts.push({enemy:{x:body.x,y:body.y},solid:{x:rect.x,y:rect.y}});
        }
      });});
    assert(!referralFeetBlocked(initial.player,await solids()),'Continue must recover an old desk-interior position');
    const deskInfo=await page.evaluate(()=>window.game.scene.getScene('ReferralVaultScene').children.list
      .filter(object=>object.name?.startsWith('referral-agency-')).map(object=>({x:object.x,y:object.y,depth:object.depth})));
    assert.equal(deskInfo.length,3);
    for(const desk of deskInfo) {
      assert.equal(desk.depth,desk.y+8);
      await move(desk.x,desk.y+20);
      await direction('ArrowUp',550);
      const s=await state();
      const logicalFeet=await feet();
      assert(!referralFeetBlocked(logicalFeet,await solids()),'Actual subpixel collision feet must stay outside the desk');
      assert(logicalFeet.y>desk.y+11,'Walk into the desk, do not pass through it');
      assert(s.player.y>=desk.y+11,'Rendered feet may touch an edge but cannot penetrate it');
      const visible=await page.evaluate(()=>{const s=window.game.scene.getScene('ReferralVaultScene');return {visible:s.player.sprite.visible,depth:s.player.sprite.depth};});
      assert(visible.visible&&visible.depth>desk.depth,'Compiler must draw in front at the desk approach');
      const promptClear=await page.evaluate(()=>{const scene=window.game.scene.getScene('ReferralVaultScene');
        const prompt=scene.children.getByName('interaction-prompt');
        return !prompt.visible||prompt.getBounds().bottom<scene.player.sprite.getBounds().top;});
      assert(promptClear,'Action banner must not cover the compiler');
      await shot(`desk-${desk.x}-blocked`);
    }
    await move(128,184);await press('Space');
    assert.equal((await state()).sceneProgress.referralEquityPacketCarried,1);
    await move(60,150);await press('Space');
    const filed=await shot('cia-filed');
    assert.equal(filed.sceneProgress.referralEquityRouteStep,1);
    assert.equal(filed.sceneProgress.referralEquityPacketCarried,2);
    assert.equal(filed.documentPoints,initial.documentPoints,'A single equity filing does not award chapter points');
    await move(98,96);await move(60,106);
    const behind=await shot('behind-cia');
    assert(behind.player.y<122-5);
    assert(await page.evaluate(()=>{const s=window.game.scene.getScene('ReferralVaultScene');return s.player.sprite.depth<s.children.getByName('referral-agency-CIA').depth;}));
    assert.deepEqual(behind.standardsViolations,initial.standardsViolations);
    await page.waitForFunction(count=>window.patrolWaypoints.size===count,REFERRAL_PATROL.length,{timeout:40000});
    const patrol=await page.evaluate(()=>({waypoints:[...window.patrolWaypoints],contacts:window.patrolSolidContacts}));
    await writeFile(`${out}/patrol.json`,JSON.stringify(patrol,null,2));
    assert.deepEqual(patrol.contacts,[],'DANN-E must complete the patrol without passing through furniture or walls');
    if(fallback) assert.equal(await page.evaluate(()=>window.game.textures.exists('pack-tiles-interiors-native')),false);
    await context.storageState({path:`${out}/earned-storage.json`});
  }
  assert.deepEqual(errors,[]);
} catch(error) {
  await shot('failure').catch(()=>{});
  throw error;
} finally {
  await writeFile(`${out}/errors.json`,JSON.stringify(errors,null,2));
  await browser.close();
}
