import { readFile, writeFile, mkdir } from "node:fs/promises";
import assert from "node:assert/strict";

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const storageFile = process.env.FRUS_QA_STORAGE;
if (!storageFile) throw new Error("FRUS_QA_STORAGE must point to an earned bindery storage snapshot.");
const mobile = process.argv.includes("--mobile");
const out = process.env.FRUS_QA_OUT || "/tmp/frus-bindery-finale";
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
  const cdp = await context.newCDPSession(page);
  const errors = [];
  page.on("pageerror", error => errors.push(String(error)));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  const state = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));
  const touch = async (points, type) => {
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
    await page.keyboard.down(name); await page.waitForTimeout(ms);
    await page.keyboard.up(name); await page.waitForTimeout(100);
  };
  const action = async () => mobile ? tap(225, 205) : key("Space");
  const pushUp = async () => {
    if (mobile) {
      await touch([[40,178]], "touchStart"); await touch([[40,152]], "touchMove");
      await page.waitForTimeout(600); await touch([], "touchEnd");
    } else await key("ArrowUp",600);
    await page.waitForTimeout(100);
  };
  const move = async (x, y) => {
    for (let tries = 0; tries < 65; tries += 1) {
      const p = (await state()).player, dx = x - p.x, dy = y - p.y;
      if (Math.hypot(dx, dy) < 5) return;
      const horizontal = Math.abs(dx) > Math.abs(dy);
      const sign = Math.sign(horizontal ? dx : dy);
      const ms = Math.min(230, Math.max(50, Math.max(Math.abs(dx), Math.abs(dy)) * 11));
      if (mobile) {
        await touch([[40, 178]], "touchStart");
        await touch([[40 + (horizontal ? sign * 26 : 0), 178 + (horizontal ? 0 : sign * 26)]], "touchMove");
        await page.waitForTimeout(ms); await touch([], "touchEnd"); await page.waitForTimeout(80);
      } else await key(horizontal ? sign > 0 ? "ArrowRight" : "ArrowLeft" : sign > 0 ? "ArrowDown" : "ArrowUp", ms);
    }
    throw new Error(`Could not walk to ${x},${y}`);
  };
  const shot = async name => {
    const current = await state();
    await writeFile(`${out}/${name}.json`, JSON.stringify(current, null, 2));
    const src = await page.evaluate(() => new Promise(resolve => window.game.renderer.snapshot(image => resolve(image.src))));
    await writeFile(`${out}/${name}-native.png`, Buffer.from(src.split(",")[1], "base64"));
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
  assert.equal((await state()).buckramBinding.status, "carried");
  await move(78, 214); await move(78, 124); await move(42, 124); await pushUp();
  assert((await state()).player.y >= 114, "The front bench must stop walking through its surface");
  assert.equal((await state()).buckramBinding.status, "carried");
  await shot("bench-collision"); await action();
  assert.equal((await state()).buckramBinding.completed, 1);
  assert.equal((await state()).documentPoints, points + 8);
  await shot("front-filed");

  const afterFrontReliability = (await state()).reliability;
  await move(78, 124); await move(78, 184); await move(42, 184); await action();
  assert.equal((await state()).mode, "choice");
  assert.equal((await state()).buckramBinding.status, "routed");
  await action(); // The initial page-number route is deliberately wrong.
  assert.equal((await state()).buckramBinding.completed, 1);
  assert.equal((await state()).reliability, afterFrontReliability);
  await shot("index-retry");
  if (mobile) { await tap(184, 126); await tap(184, 126); }
  else { await key("ArrowRight"); await action(); }
  assert.equal((await state()).buckramBinding.completed, 2);
  assert.equal((await state()).documentPoints, points + 16);

  await move(78, 184); await move(78, 124); await move(128, 124); await move(128, 111); await action();
  let current = await shot("human-seal");
  assert.equal(current.mode, "choice");
  assert.equal(current.buckramBinding.completed, 2);
  const layout = await page.evaluate(() => {
    const board = window.game.scene.getScene("EndingScene").children.getByName("binding-certification-board");
    return board.list.filter(child => typeof child.text === "string" || (child.type === "Rectangle" && [90, 110].includes(child.width)))
      .map(child => { const b = child.getBounds(); return { type: child.type, text: child.text, x: b.x, y: b.y, width: b.width, height: b.height }; });
  });
  const canvas = await page.locator("#game-shell canvas:not(#pixel-proof-overlay)").boundingBox();
  for (const item of layout) {
    assert(item.x >= 9 && item.x + item.width <= 247 && item.y >= 28 && item.y + item.height <= 212, `Panel overflow: ${JSON.stringify(item)}`);
    if (item.type === "Rectangle") {
      assert(item.y + item.height < 176, "Decision target overlaps the touch A hit area");
      assert(item.height * canvas.height / 240 >= 44, "Decision touch target is smaller than 44 CSS pixels");
    }
  }
  await writeFile(`${out}/standards-layout.json`, JSON.stringify(layout, null, 2));
  const stationary = current.player;
  const swing = current.playerCombat.weapon.swingId;
  await page.waitForTimeout(850);
  assert.deepEqual((await state()).player, stationary);
  if (mobile) await tap(192, 158); else await key("x");
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
  if (mobile) await tap(80, 158); else await action();
  current = await state();
  assert.equal(current.buckramBinding.completed, 3);
  assert.equal(current.sceneProgress.kelloggFinalCertificationComplete, 1);
  assert.deepEqual(current.documentCandidates, initial.documentCandidates);
  assert.equal(current.documentPoints, points + 22);
  await shot("human-sealed");

  await move(128, 126); await move(214, 126); await move(214, 119); await action();
  assert.equal((await state()).buckramBinding.completed, 4);
  await shot("gpo-filed");
  await move(178, 126); await move(178, 184); await move(214, 184); await action();
  current = await shot("press-ready");
  assert.equal(current.buckramBinding.completed, 5);
  assert.equal(current.finalGateCertification.status, "ready");
  assert.equal(current.documentPoints, points + 40);
  assert.notEqual(current.finalGateCertification.status, "published");
  await context.storageState({ path: `${out}/earned-press-storage.json` });
  await move(178, 184); await move(178, 174); await move(128, 174); await move(128, 164); await action();
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
  await writeFile(`${out}/result.json`, JSON.stringify({ mobile, startPoints: points, finalPoints: current.documentPoints,
    completedPackets: current.buckramBinding.completed, certification: current.finalGateCertification, errors }, null, 2));
  console.log(JSON.stringify({ mobile, finalPoints: current.documentPoints, certification: current.finalGateCertification.status, errors }));
} finally { await browser.close(); }
