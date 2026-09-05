import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');

const base = process.env.FRUS_QA_URL ?? 'http://127.0.0.1:5195/';
const root = process.env.FRUS_QA_OUT ?? '/tmp/frus-referral-manifest';
assert(process.env.FRUS_QA_STORAGE, 'Set FRUS_QA_STORAGE to an earned Referral entry from qa-network-ledger.mjs');
const browser = await chromium.launch({ headless: true,
  ...(process.env.CHROMIUM_EXECUTABLE ? { executablePath: process.env.CHROMIUM_EXECUTABLE } : {}) });
async function run(mobile) {
  const label = mobile ? 'mobile-375x667-dpr3' : 'desktop';
  const out = `${root}/${label}`;
  await mkdir(out, { recursive: true });
  const context = await browser.newContext({ storageState: JSON.parse(await readFile(process.env.FRUS_QA_STORAGE, 'utf8')), viewport: mobile ? {width:375,height:667} : {width:1024,height:960}, hasTouch:mobile, isMobile:mobile, deviceScaleFactor:mobile?3:1 });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  const state = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));
  async function point(x,y) {
    const b = await page.locator('canvas').first().boundingBox();
    return { x:b.x+x*b.width/256, y:b.y+y*b.height/240, id:1 };
  }
  async function touch(x,y,dx=0,dy=0,ms=48) {
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[await point(x,y)]});
    if(dx || dy) await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[await point(x+dx,y+dy)]});
    await page.waitForTimeout(ms);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  }
  async function press(key='Space') {
    if (mobile) await touch(...(key === 'Enter' ? [86,154] : key === 'Escape' ? [174,216] : [225,205])); else await page.keyboard.press(key,{delay:45});
    await page.waitForTimeout(180);
  }
  async function direction(key) {
    if(mobile) {
      const [dx,dy] = {ArrowLeft:[-26,0],ArrowRight:[26,0],ArrowUp:[0,-26],ArrowDown:[0,26]}[key];
      await touch(40,178,dx,dy,80);
    } else {
      await page.keyboard.down(key); await page.waitForTimeout(80); await page.keyboard.up(key);
    }
    await page.waitForTimeout(20);
  }
  async function move(x,y,destination) {
    let stalled=0;
    for(let i=0;i<180;i++) {
      const before=await state();
      if(destination && (before.scene===destination || before.roomTraversal?.currentRoomId===destination)) { await page.waitForTimeout(450); return; }
      const dx=x-before.player.x,dy=y-before.player.y;
      if(!destination && Math.hypot(dx,dy)<5) return;
      await direction(Math.abs(dx)>Math.abs(dy) ? dx>0?'ArrowRight':'ArrowLeft' : dy>0?'ArrowDown':'ArrowUp');
      const after=await state();
      stalled=Math.hypot(after.player.x-before.player.x,after.player.y-before.player.y)<1?stalled+1:0;
      if(stalled>12) throw new Error(`Blocked at ${JSON.stringify(after.player)} toward ${x},${y}: ${after.objective}`);
    }
    throw new Error(`Movement timeout ${x},${y}`);
  }
  let index=0;
  async function shot(name) {
    await page.waitForTimeout(250);
    const s=await state();
    const path=`${out}/${String(index++).padStart(2,'0')}-${name}`;
    const native=await page.evaluate(()=>new Promise(resolve=>window.game.renderer.snapshot(image=>resolve(image.src))));
    await writeFile(`${path}-native.png`,Buffer.from(native.split(',')[1],'base64'));
    await page.screenshot({path:`${path}.png`});
    await writeFile(`${path}.json`,JSON.stringify(s,null,2));
    await context.storageState({path: `${out}/earned-storage.json`});
    if(name === 'manifest-held') await context.storageState({path: `${out}/manifest-held-storage.json`});
    console.log(label,name,JSON.stringify({scene:s.scene,room:s.roomTraversal?.currentRoomId,objective:s.objective,held:s.heldItem,progress:Object.fromEntries(Object.entries(s.sceneProgress).filter(([key])=>/referral|Permission|Appeal/.test(key))),player:s.player,reliability:s.reliability}));
    return s;
  }
  async function resume() {
    await page.goto(`${base}?text=full`);
    await page.waitForFunction(()=>window.render_game_to_text && JSON.parse(window.render_game_to_text()).scene==='TapToStartScene');
    await press('Enter');
    await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).scene==='ReferralVaultScene');
    await page.waitForTimeout(950);
  }
  try {
    await resume();
    await shot('initial');
    await move(34,180); await move(128,180);
    await press();
    let s=await shot('equity-held');
    assert.equal(s.sceneProgress.referralEquityPacketCarried,1);
    await move(60,185);
    await move(60,164);
    await press();
    s=await shot('first-equity-filed');
    assert.equal(s.sceneProgress.referralEquityRouteStep,1);
    assert.equal(s.sceneProgress.referralEquityPacketCarried,2);
    assert.equal(s.objective,'2/3 TO DOD');
    assert.equal(s.heldItem,'Equity Batch: BASE');
    const beforeResume=s;
    const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('rubyRuleFrusQuestSave')).state);
    assert.equal(saved.sceneProgress.referralEquityPacketCarried,2);
    assert.equal(saved.heldItem,'Equity Batch: BASE');
    assert.equal(saved.roomTraversal.currentRoomId,'R1');
    await resume();
    s=await shot('equity-two-resumed');
    assert.equal(s.heldItem,'Equity Batch: BASE');
    assert.equal(s.objective,'2/3 TO DOD');
    assert(Math.hypot(s.player.x-beforeResume.player.x,s.player.y-beforeResume.player.y)<=2);
    let beforeWrong=s.reliability;
    await press();
    s=await shot('wrong-equity-kept-in-hand');
    assert.equal(s.sceneProgress.referralEquityPacketCarried,2);
    assert.equal(s.sceneProgress.referralEquityRouteStep,1);
    assert(s.reliability <= beforeWrong-2);
    assert.match(s.latestMessage,/remains in hand/);
    await move(128,164); await press();
    s=await shot('equity-three-handoff');
    assert.equal(s.sceneProgress.referralEquityPacketCarried,3);
    assert.equal(s.objective,'3/3 TO NSC');
    await move(196,164); await press();
    s=await shot('equity-batch-complete');
    assert.equal(s.sceneProgress.referralEquityRouteComplete,1);
    assert.equal(s.sceneProgress.referralEquityPacketCarried,0);
    assert.equal(s.objective,'TAKE DRAFT AT CHAT');
    await move(196,145); await press();
    s=await shot('manifest-held');
    assert.equal(s.heldItem,'StateChat Draft Manifest');
    assert.equal(s.sceneProgress.referralManifestCarried,1);
    await resume();
    s=await shot('manifest-resumed');
    assert.equal(s.heldItem,'StateChat Draft Manifest');
    assert.equal(s.objective,'DRAFT TO HUMAN DESK');
    await move(196,183); await move(75,183); await press();
    s=await shot('manifest-review-open');
    assert.equal(s.mode,'choice');
    assert.equal(s.choice.options[2].value,'CIA');
    assert(!s.sceneProgress.referralManifestReviewComplete);
    const frozen={player:s.player,combat:s.playerCombat,threats:s.visibleThreats,reliability:s.reliability,points:s.documentPoints};
    await page.waitForTimeout(2200);
    const reading=await state();
    assert.deepEqual({player:reading.player,combat:reading.playerCombat,threats:reading.visibleThreats,reliability:reading.reliability,points:reading.documentPoints},frozen);
    await context.storageState({path:`${out}/pending-manifest.json`});
    async function click(x,y) {
      if(mobile) await touch(x,y);
      else { const p=await point(x,y); await page.mouse.click(p.x,p.y,{delay:45}); }
      await page.waitForTimeout(200);
    }
    await click(128,178);
    s=await shot('incorrect-draft-rejected');
    assert.equal(s.mode,'choice');
    assert(!s.sceneProgress.referralManifestReviewComplete);
    assert.equal(s.documentPoints,frozen.points);
    assert.equal(s.reliability,frozen.reliability);
    assert.match(s.latestMessage,/NSC equity/);
    if(mobile) await click(210,148);
    else await page.keyboard.press('ArrowRight',{delay:50});
    await page.waitForTimeout(180);
    s=await shot('partial-draft-edited');
    assert.equal(s.choice.options[2].value,'DOD');
    await press('Escape');
    s=await shot('cancel-keeps-draft');
    assert.equal(s.mode,'explore');
    assert.equal(s.sceneProgress.referralManifestCarried,1);
    assert(!s.sceneProgress.referralManifestReviewComplete);
    assert.equal(s.playerCombat.weapon.swingId,frozen.combat.weapon.swingId);
    await resume();
    await press();
    s=await shot('partial-draft-restored');
    assert.equal(s.mode,'choice');
    assert.equal(s.choice.options[2].value,'DOD');
    if(mobile) {
      await click(172,148);
      assert.equal((await state()).choice.options[2].value,'CIA');
      await click(210,148);
      await click(210,148);
    }
    else {
      await page.keyboard.press('ArrowDown',{delay:50});await page.waitForTimeout(80);
      await page.keyboard.press('ArrowDown',{delay:50});await page.waitForTimeout(80);
      await page.keyboard.press('ArrowRight',{delay:50});
    }
    await page.waitForTimeout(180);
    s=await shot('corrected-unfiled-manifest');
    assert.equal(s.choice.options[2].value,'NSC');
    assert(!s.sceneProgress.referralManifestReviewComplete);
    assert.equal(s.documentPoints,frozen.points);
    if(mobile) await click(128,178);
    else { await page.keyboard.press('ArrowDown',{delay:50});await page.waitForTimeout(80);await press(); }
    s=await shot('human-concurrence');
    assert.equal(s.sceneProgress.referralManifestReviewComplete,1);
    assert.equal(s.sceneProgress.referralManifestCarried,0);
    assert.equal(s.objective,'TAKE REVIEW BATCH');
    assert.equal(s.documentPoints,frozen.points+8);
    await move(128,180); await press();
    s=await shot('treatment-batch-held');
    assert.equal(s.sceneProgress.referralTreatmentDocketCarried,1);
    assert.equal(s.objective,'1/3 TO PERMIT');
    await move(60,185); await press();
    s=await shot('appeal-auto-handoff');
    assert.equal(s.sceneProgress.referralTreatmentDocketCarried,2);
    assert.equal(s.sceneProgress.foreignGovernmentPermissionComplete,1);
    assert.equal(s.objective,'2/3 TO APPEAL');
    await resume();
    s=await shot('appeal-resumed');
    assert.equal(s.heldItem,'Review Batch: APPEAL');
    beforeWrong=s.reliability;
    await press();
    s=await shot('wrong-treatment-kept-in-hand');
    assert.equal(s.sceneProgress.referralTreatmentDocketCarried,2);
    assert.equal(s.sceneProgress.referralTreatmentStep,1);
    assert(s.reliability <= beforeWrong-2);
    assert.match(s.latestMessage,/remains in hand/);
    await move(128,164); await press();
    s=await shot('bracket-auto-handoff');
    assert.equal(s.sceneProgress.referralTreatmentDocketCarried,3);
    assert.equal(s.sceneProgress.withholdingAppealComplete,1);
    assert.equal(s.objective,'3/3 TO BRACKET');
    await move(196,185);
    const beforeClear=(await state()).player;
    await press();
    s=await shot('visible-treatment-gate-open');
    assert.equal(s.sceneProgress.referralPhysicalReviewComplete,1);
    assert.equal(s.sceneProgress.referralTreatmentDocketCarried,0);
    assert.equal(s.heldItem,null);
    assert.equal(s.objective,'EXIT EAST - SLIP');
    assert(s.processStamps.includes('referral'));
    assert(Math.hypot(s.player.x-beforeClear.x,s.player.y-beforeClear.y)<3,'Completion must not teleport player');
    await move(220,185); await move(220,124); await move(248,124,'R2');
    s=await shot('concurrence-room-entry');
    assert.equal(s.objective,'TAKE CONCURRENCE');
    await resume();
    s=await shot('reward-room-resumed');
    assert.equal(s.roomTraversal.currentRoomId,'R2');
    assert(s.roomTraversal.visitedRoomIds.includes('R1'));
    assert.equal(s.heldItem,null);
    await move(110,150); await press();
    s=await shot('concurrence-slip-earned');
    assert(s.inventory.includes('Concurrence Slip'));
    assert.equal(s.objective,'EXIT EAST - EDITOR');
    await resume();
    s=await shot('slip-resumed');
    assert.equal(s.roomTraversal.currentRoomId,'R2');
    assert(s.inventory.includes('Concurrence Slip'));
    const pointsBefore=s.documentPoints;
    await press();
    assert.equal((await state()).documentPoints,pointsBefore);
    await move(60,150); await move(28,124); await move(7,124,'R1');
    s=await shot('backtracked-with-no-refiling');
    assert.equal(s.objective,'EXIT EAST - SLIP');
    await press();
    assert.equal((await state()).documentPoints,pointsBefore);
    await move(248,124,'R2');
    await move(60,175); await move(214,175); await move(221,124); await move(248,124,'SilentReadScene');
    s=await shot('editor-handoff');
    assert.equal(s.scene,'SilentReadScene');
    assert(s.inventory.includes('Concurrence Slip'));
    const metrics=await page.evaluate(()=>({mobile:window.rubyRuleMobileMetrics,overflow:document.documentElement.scrollWidth>innerWidth}));
    assert.equal(metrics.overflow,false);
    await writeFile(`${out}/metrics.json`,JSON.stringify(metrics,null,2));
  } finally {
    try { await writeFile(`${out}/errors.json`,JSON.stringify(errors,null,2)); }
    finally { await context.close(); }
    assert.deepEqual(errors,[]);
  }
}
try { await run(process.argv.includes('--mobile')); } finally { await browser.close(); }
