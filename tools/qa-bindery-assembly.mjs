import { pressPortraitControl } from './portrait-input-fixture.mjs';
import { readFile, writeFile, mkdir } from "node:fs/promises";
import assert from "node:assert/strict";

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const storageFile = process.env.FRUS_QA_STORAGE;
if (!storageFile) throw new Error("FRUS_QA_STORAGE must point to an earned bindery storage snapshot.");
const mobile = process.argv.includes("--mobile");
const cpuThrottle = Number(process.env.FRUS_QA_CPU_THROTTLE ?? 1);
assert(Number.isFinite(cpuThrottle) && cpuThrottle >= 1, "CPU throttle must be at least one");
const out = process.env.FRUS_QA_OUT || "/tmp/frus-bindery-assembly";
const url = process.env.FRUS_QA_URL || "http://127.0.0.1:5195/";
const origin = new URL(url).origin;
const storage = JSON.parse(await readFile(storageFile, "utf8"));
for (const entry of storage.origins) entry.origin = origin;
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE });
try {
  const context = await browser.newContext({ storageState: storage,
    viewport: mobile ? { width: 375, height: 667 } : { width: 1024, height: 960 },
    hasTouch: mobile, isMobile: mobile, deviceScaleFactor: mobile ? 3 : 1 });
  const page = await context.newPage();
  if(mobile)for(const device of [page.keyboard,page.mouse])for(const method of ['press','down','up','click','move','type'])if(typeof device[method]==='function')device[method]=()=>{throw Error(`Non-touch input: ${method}`);};
  const cdp = await context.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: cpuThrottle });
  const errors = [];
  page.on("pageerror", error => errors.push(String(error)));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  const state = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));
  const touch = async (points, type) => {
    // Release immediately: querying layout here prolonged every directional hold.
    if (!points.length) {
      await cdp.send("Input.dispatchTouchEvent", { type, touchPoints: [] });
      return;
    }
    const box = await page.locator("canvas").first().boundingBox();
    await cdp.send("Input.dispatchTouchEvent", { type, touchPoints: points.map(([x, y, id = 1]) => ({
      x: box.x + x * box.width / 256, y: box.y + y * box.height / 240, id
    })) });
  };
  const tap = async (x, y) => {
    await touch([[x, y]], "touchStart"); await page.waitForTimeout(70);
    await touch([], "touchEnd"); await page.waitForTimeout(130);
  };
  const key = async (name, ms = 65) => {
    if(mobile && await pressPortraitControl(page,cdp,name,ms)){await page.waitForTimeout(100);return;}
    await page.keyboard.down(name); await page.waitForTimeout(ms);
    await page.keyboard.up(name); await page.waitForTimeout(100);
  };
  const action = async () => { if(mobile&&await pressPortraitControl(page,cdp,"Space",65)){await page.waitForTimeout(130);return;} return mobile ? tap(225,205) : key("Space"); };
  const pushUp = async () => { await key("ArrowUp",600);await page.waitForTimeout(100); };
  const move = async (x, y) => {
    for (let tries = 0; tries < 65; tries += 1) {
      const p = (await state()).player, dx = x - p.x, dy = y - p.y;
      if (Math.hypot(dx, dy) < 5) return;
      if (process.env.FRUS_QA_TRACE_MOVEMENT) console.log(JSON.stringify({target:{x,y},tries,player:p,mode:(await state()).mode}));
      const horizontal = Math.abs(dx) > Math.abs(dy);
      const sign = Math.sign(horizontal ? dx : dy);
      const ms = Math.min(180, Math.max(16, Math.max(Math.abs(dx), Math.abs(dy)) * 6));
      if(mobile&&await pressPortraitControl(page,cdp,horizontal?sign>0?"ArrowRight":"ArrowLeft":sign>0?"ArrowDown":"ArrowUp",ms)){await page.waitForTimeout(80);continue;}
      await key(horizontal ? sign > 0 ? "ArrowRight" : "ArrowLeft" : sign > 0 ? "ArrowDown" : "ArrowUp", ms);
    }
    throw new Error(`Could not walk to ${x},${y}; player=${JSON.stringify((await state()).player)}`);
  };
  const shot = async name => {
    const current = await state();
    await writeFile(`${out}/${name}.json`, JSON.stringify(current, null, 2));
    await page.screenshot({ path: `${out}/${name}.png` });
    assert.equal(await page.locator("#game-shell canvas:not(#pixel-proof-overlay)").count(), 1);
    return current;
  };
  const resume = async () => {
    await page.goto(`${url}?text=full`);
    await page.waitForFunction(() => window.render_game_to_text && JSON.parse(window.render_game_to_text()).scene === "TapToStartScene");
    if (mobile) await tap(86, 154); else await key("Enter");
    await page.waitForFunction(() => ["EndingScene", "TrueEndingScene"].includes(JSON.parse(window.render_game_to_text()).scene));
    await page.waitForTimeout(1300);
  };
  await resume();
  await page.waitForFunction(() => window.game.scene.getScene("UIScene").questBandCueText.text === "PACKET: SOUTH INBOX");
  const initial = await shot("entry");
  const labelsSeparate = await page.evaluate(() => {
    const scene = window.game.scene.getScene("EndingScene");
    const inbox = scene.children.getByName("bindery-inbox-label").getBounds();
    const exit = scene.children.getByName("bindery-return-label").getBounds();
    return inbox.right <= exit.left || exit.right <= inbox.left
      || inbox.bottom <= exit.top || exit.bottom <= inbox.top;
  });
  assert(labelsSeparate, "Vault and inbox labels must not overlap");
  assert.equal(initial.buckramBinding.completed, 0);
  assert.equal(initial.sceneProgress.blackVaultBossCleared, 1);
  const points = initial.documentPoints;
  await move(128, 209); await pushUp();
  assert((await state()).player.y >= 204, "The inbox must be solid at the player's feet");
  await action();
  assert.equal((await state()).buckramBinding.completed, 2);
  assert.equal((await state()).documentPoints, points + 16);
  assert.notEqual((await state()).sceneProgress.kelloggFinalCertificationComplete, 1);
  await page.waitForTimeout(700);await shot("pages-assembled");
  await move(78, 214);await move(78, 124);await move(128, 124);await move(128, 111);await action();
  let current = await shot("human-seal");
  assert.equal(current.mode, "choice");
  assert.equal(current.buckramBinding.completed, 2);
  const sealAction=async(key)=>{const e=page.locator(`.binding-certification-desk [data-focus-key=${key}]`);if(mobile)await e.tap();else await e.click();await page.waitForTimeout(150);};
  const layout=await page.locator('.binding-certification-desk button').evaluateAll(buttons=>buttons.map(e=>{const r=e.getBoundingClientRect();return {width:r.width,height:r.height,top:r.top,bottom:r.bottom};}));
  for(const item of layout)assert(item.width>=44&&item.height>=44&&item.top>=0,'Native seal controls must stay accessible');
  await writeFile(`${out}/standards-layout.json`,JSON.stringify(layout,null,2));
  const stationary = current.player;
  const swing = current.playerCombat.weapon.swingId;
  await page.waitForTimeout(850);
  assert.deepEqual((await state()).player, stationary);
  await sealAction("leave");
  assert.equal((await state()).mode, "explore");
  assert.equal((await state()).playerCombat.weapon.swingId, swing);
  const beforeResume = await state();
  await context.storageState({ path: `${out}/pending-seal-storage.json` });
  await resume();
  current = await state();
  assert.equal(current.buckramBinding.status, "routed");
  assert.equal(current.buckramBinding.completed, 2);
  assert.deepEqual(current.player, beforeResume.player);
  assert.equal(current.documentPoints, points + 16);
  assert.deepEqual(current.documentCandidates, initial.documentCandidates);
  await action();
  assert.equal((await state()).mode, "choice");
  await sealAction("seal");
  current = await state();
  assert.equal(current.buckramBinding.completed, 5);
  assert.equal(current.sceneProgress.kelloggFinalCertificationComplete, 1);
  assert.deepEqual(current.documentCandidates, initial.documentCandidates);
  assert.equal(current.documentPoints, points + 40);
  await shot("human-sealed");

  await page.waitForTimeout(700);current = await shot("press-ready");
  assert.equal(current.buckramBinding.completed, 5);
  assert.equal(current.finalGateCertification.status, "ready");
  assert.equal(current.documentPoints, points + 40);
  assert.notEqual(current.finalGateCertification.status, "published");
  await context.storageState({ path: `${out}/earned-press-storage.json` });
  await move(128, 126); await move(178, 126); await move(178, 174); await move(128, 174); await move(128, 164); await action();
  await page.waitForTimeout(1700);
  current = await shot("published");
  assert.equal(current.finalGateCertification.status, "published");
  assert.equal(current.documentPoints, points + 40);
  assert.equal(current.reliability, Math.min(100, initial.reliability + 15));
  const completionStats = current.completionStats;
  await context.storageState({ path: `${out}/earned-publication-storage.json` });
  await resume();
  current = await shot("published-continue");
  assert.deepEqual(current.completionStats, completionStats);
  assert.equal(current.documentPoints, points + 40);
  const missed = Boolean(initial.sceneProgress.statutoryDeadlineMissed);
  assert.equal(current.statutoryClock.deadlineMissed, missed);
  assert.equal(current.statutoryClock.label, missed ? "Published after the 30-year deadline" : "Published within the 30-year mandate");
  const summaryPage = () => page.evaluate(() => window.game.scene.getScenes(true)
    .map(scene => scene.children.getByName('publication-summary')).find(Boolean)?.getData('page'));
  for(let i=0;i<2 && await summaryPage()!=='record';i++) {
    if(mobile)await tap(67,216);else await key('Space');
  }
  assert.equal(await summaryPage(),'record');
  const recordText = await page.evaluate(() => window.game.scene.getScenes(true)
    .map(scene => scene.children.getByName('publication-summary')).find(Boolean).list
    .filter(node => typeof node.text==='string').map(node=>node.text));
  assert(recordText.includes('DEADLINE'));
  assert(recordText.includes(missed?'MISSED':'MET'));
  await shot('deadline-record');
  assert.deepEqual(errors, []);
  await writeFile(`${out}/result.json`, JSON.stringify({ mobile, cpuThrottle, startPoints: points, finalPoints: current.documentPoints,
    completedPackets: current.buckramBinding.completed, certification: current.finalGateCertification, errors }, null, 2));
  console.log(JSON.stringify({ mobile, finalPoints: current.documentPoints, certification: current.finalGateCertification.status, errors }));
} finally { await browser.close(); }
