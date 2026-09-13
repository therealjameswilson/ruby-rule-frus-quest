import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright");
assert(process.env.FRUS_QA_STORAGE, "Supply an earned pending-seal storage snapshot.");
const mobile = process.argv.includes("--mobile"), baseline = process.argv.includes("--baseline");
const out = process.env.FRUS_QA_OUT ?? "/tmp/frus-bindery-return";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE });
const errors = [], result = {};
try {
  const context = await browser.newContext({
    storageState: JSON.parse(await readFile(process.env.FRUS_QA_STORAGE, "utf8")),
    viewport: mobile ? { width: 375, height: 667 } : { width: 1024, height: 960 },
    hasTouch: mobile, isMobile: mobile, deviceScaleFactor: mobile ? 3 : 1
  });
  const page = await context.newPage(), cdp = await context.newCDPSession(page);
  page.on("pageerror", error => errors.push(String(error)));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  const state = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));
  const touch = async (x, y, dx = 0, dy = 0, ms = 65) => {
    const box = await page.locator("canvas:not(#pixel-proof-overlay)").boundingBox();
    const point = (x, y) => ({ x: box.x + x * box.width / 256, y: box.y + y * box.height / 240, id: 1 });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [point(x, y)] });
    if (dx || dy) await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [point(x + dx, y + dy)] });
    await page.waitForTimeout(ms);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  };
  const key = async (name, ms = 65) => {
    await page.keyboard.down(name); await page.waitForTimeout(ms); await page.keyboard.up(name);
  };
  const action = async () => { if (mobile) await touch(225, 205); else await key("Space"); await page.waitForTimeout(200); };
  const move = async (x, y, destination) => {
    for (let attempt = 0; attempt < 100; attempt++) {
      const s = await state();
      if (destination && s.scene === destination) return;
      const dx = x - s.player.x, dy = y - s.player.y;
      if (!destination && Math.hypot(dx, dy) < 4) return;
      assert.equal(s.mode, "explore");
      const horizontal = Math.abs(dx) > Math.abs(dy), sign = Math.sign(horizontal ? dx : dy);
      if (mobile) await touch(40, 178, horizontal ? 26 * sign : 0, horizontal ? 0 : 26 * sign, 70);
      else await key(horizontal ? sign > 0 ? "ArrowRight" : "ArrowLeft" : sign > 0 ? "ArrowDown" : "ArrowUp", 70);
      await page.waitForTimeout(25);
    }
    throw Error(`Could not walk to ${x},${y}`);
  };
  const scene = async name => {
    await page.waitForFunction(name => window.render_game_to_text && JSON.parse(window.render_game_to_text()).scene === name, name);
    await page.waitForTimeout(950);
  };
  const shot = async label => {
    const s = await state();
    const image = await page.evaluate(() => new Promise(resolve => window.game.renderer.snapshot(image => resolve(image.src))));
    await writeFile(`${out}/${label}-native.png`, Buffer.from(image.split(",")[1], "base64"));
    await page.screenshot({ path: `${out}/${label}.png` });
    await writeFile(`${out}/${label}.json`, JSON.stringify(s, null, 2));
    console.log(label, s.scene, s.documentPoints, s.buckramBinding?.completed, s.buckramBinding?.status);
    return s;
  };
  const resume = async () => {
    await page.goto(new URL("?text=full", process.env.FRUS_QA_URL ?? "http://127.0.0.1:5195/").href);
    await scene("TapToStartScene");
    if (mobile) await touch(86, 154); else await key("Enter");
    await scene("EndingScene");
  };
  await resume();
  const initial = await shot("entry");
  assert.equal(initial.buckramBinding.completed, 2);
  assert.equal(initial.buckramBinding.status, "routed");
  const unchanged = s => {
    assert.equal(s.documentPoints, initial.documentPoints);
    assert.deepEqual(s.documentCandidates, initial.documentCandidates);
    assert.equal(s.sceneProgress.buckramBindingStep, initial.sceneProgress.buckramBindingStep);
    assert.equal(s.sceneProgress.buckramBindingStatus, initial.sceneProgress.buckramBindingStatus);
    assert.equal(s.sceneProgress.blackVaultBossCleared, 1);
    assert.deepEqual(s.inventory, initial.inventory);
    assert.deepEqual(s.volumeFragments, initial.volumeFragments);
    assert.equal(s.reliability, initial.reliability);
    assert.deepEqual(s.completionStats.danneVariantsDefeated, initial.completionStats.danneVariantsDefeated);
    assert.equal(s.completionStats.volumePiecesCollected, initial.completionStats.volumePiecesCollected);
    assert.equal(s.completionStats.completed, initial.completionStats.completed);
    assert.equal(s.completionStats.completedAt, initial.completionStats.completedAt);
  };
  // The bindery press is solid; use its west aisle instead of crossing its top.
  await move(78, 126); await move(80, 205); await move(20, 205);
  const doorway = await shot("doorway");
  if (baseline) {
    await action(); await action();
    const stuck = await shot("no-return-exit");
    assert.equal(stuck.scene, "EndingScene"); unchanged(stuck);
    result.baseline = { exits: stuck.roomTraversal.exits, objective: stuck.objective, message: stuck.latestMessage };
  } else {
    assert.equal(doorway.roomTraversal.exits.west, "DV1");
    assert.equal(doorway.nearestInteractable, "RETURN TO VAULT");
    if (mobile) await touch(224, 16); else await key("Escape");
    await page.waitForTimeout(200); assert.equal((await state()).mode, "pause");
    const close = (await state()).pauseMenu.controls.find(control => control.id === "close");
    if (mobile) await touch(close.x, close.y); else await key("Escape");
    await page.waitForTimeout(300); assert.equal((await state()).scene, "EndingScene");
    await action(); await scene("BlackVaultLairScene");
    const vault = await shot("cleared-vault"); unchanged(vault);
    assert(!vault.visibleThreats.some(threat => threat.status === "blocking" && threat.hp > 0));
    await move(128, 214); await action(); await scene("SilentReadScene");
    unchanged(await shot("proofing-return"));
    await move(228, 202); await move(228, 128); await move(246, 128, "BlackVaultLairScene"); await scene("BlackVaultLairScene");
    await move(128, 134); await action();
    for (let step = 0; step < 8 && (await state()).scene !== "EndingScene"; step++) await action();
    await scene("EndingScene");
    const returned = await shot("pending-seal-restored"); unchanged(returned);
    assert.equal(returned.buckramBinding.completed, 2); assert.equal(returned.buckramBinding.status, "routed");
    assert.notEqual(returned.nearestInteractable, "RETURN TO VAULT");
    await context.storageState({ path: `${out}/earned-return-storage.json` });
    await resume(); unchanged(await shot("return-continue"));
    result.roundTrip = { points: returned.documentPoints, completed: returned.buckramBinding.completed, status: returned.buckramBinding.status };
  }
  assert.deepEqual(errors, []);
  console.log("PASS", mobile ? "touch" : "desktop", baseline ? "baseline missing exit reproduced" : "bindery, cleared vault, proofing and return");
} catch (error) { result.failure = String(error); console.error(error); process.exitCode = 1; }
finally { await writeFile(`${out}/result.json`, JSON.stringify({ ...result, errors }, null, 2)); await browser.close(); }
