import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright");
assert(process.env.FRUS_QA_STORAGE, "Supply an earned pending-seal storage snapshot.");
const mobile = process.argv.includes("--mobile"), baseline = process.argv.includes("--baseline");
const out = process.env.FRUS_QA_OUT ?? "/tmp/frus-editorial-repair";
await mkdir(out, { recursive: true });
const storage = JSON.parse(await readFile(process.env.FRUS_QA_STORAGE, "utf8"));
const entry = storage.origins.flatMap(origin => origin.localStorage).find(entry => entry.name === "rubyRuleFrusQuestSave");
const save = JSON.parse(entry.value);
// Deliberately damaged legacy-save fixture after earned progress, not an earned gameplay mistake.
const note = save.state.documentCandidates.find(document => document.id === "source_note_047");
note.undisclosedDeletion = true; note.annotationNeeded = true; delete note.editorialRepair;
save.state.standardsViolations.push({ id: "qa-lost-bracket", documentId: note.id, violation: "undisclosed_deletion",
  label: "QA missing withholding indication", context: "QA injected post-completion lost bracket", count: 1, unresolved: true });
entry.value = JSON.stringify(save);
await writeFile(`${out}/seeded-fault-storage.json`, JSON.stringify(storage));
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE });
const errors = [], result = { scenario: "Injected missing bracket on an earned pending-seal save" };
try {
  const context = await browser.newContext({ storageState: storage,
    viewport: mobile ? { width: 375, height: 667 } : { width: 1024, height: 960 },
    hasTouch: mobile, isMobile: mobile, deviceScaleFactor: mobile ? 3 : 1 });
  const page = await context.newPage(), cdp = await context.newCDPSession(page);
  page.on("pageerror", error => errors.push(String(error)));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  const state = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));
  const point = async (x, y) => {
    const box = await page.locator("canvas:not(#pixel-proof-overlay)").boundingBox();
    return { x: box.x + x * box.width / 256, y: box.y + y * box.height / 240, id: 1 };
  };
  const touch = async (x, y, dx = 0, dy = 0, ms = 65) => {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [await point(x, y)] });
    if (dx || dy) await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [await point(x + dx, y + dy)] });
    await page.waitForTimeout(ms);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  };
  const key = async (name, ms = 65) => {
    await page.keyboard.down(name); await page.waitForTimeout(ms); await page.keyboard.up(name);
  };
  const action = async () => { if (mobile) await touch(225, 205); else await key("Space"); await page.waitForTimeout(200); };
  const click = async (x, y) => {
    if (mobile) await touch(x, y); else { const p = await point(x, y); await page.mouse.click(p.x, p.y); }
    await page.waitForTimeout(200);
  };
  const cancel = async () => { if (mobile) await touch(174, 216); else await key("Escape"); await page.waitForTimeout(250); };
  const move = async (x, y, destination) => {
    for (let attempt = 0; attempt < 140; attempt++) {
      const s = await state();
      if (destination && (s.scene === destination || s.roomTraversal?.currentRoomId === destination)) { await page.waitForTimeout(600); return; }
      const dx = x - s.player.x, dy = y - s.player.y;
      if (!destination && Math.hypot(dx, dy) < 4) return;
      assert.equal(s.mode, "explore");
      const horizontal = Math.abs(dx) > Math.abs(dy), sign = Math.sign(horizontal ? dx : dy);
      if (mobile) await touch(40, 178, horizontal ? 26 * sign : 0, horizontal ? 0 : 26 * sign, 70);
      else await key(horizontal ? sign > 0 ? "ArrowRight" : "ArrowLeft" : sign > 0 ? "ArrowDown" : "ArrowUp", 70);
      await page.waitForTimeout(25);
    }
    throw Error(`Could not walk to ${x},${y}: ${JSON.stringify((await state()).player)}`);
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
    console.log(label, s.scene, s.documentPoints, s.objective);
    return s;
  };
  const resume = async name => {
    await page.goto(new URL("?text=full", process.env.FRUS_QA_URL ?? "http://127.0.0.1:5195/").href);
    await scene("TapToStartScene");
    if (mobile) await touch(86, 154); else await key("Enter");
    await scene(name);
  };
  const document = s => s.documentCandidates.find(document => document.id === "source_note_047");
  await resume("EndingScene");
  const initial = await shot("blocked-seal-entry");
  const unchanged = s => {
    assert.equal(s.documentPoints, initial.documentPoints);
    assert.equal(s.reliability, initial.reliability);
    assert.deepEqual(s.inventory, initial.inventory);
    assert.deepEqual(s.volumeFragments, initial.volumeFragments);
    assert.deepEqual(document(s).equities, document(initial).equities);
    assert.equal(document(s).reviewStatus, document(initial).reviewStatus);
    assert.equal(document(s).citationComplete, document(initial).citationComplete);
    assert.equal(s.sceneProgress.silentReadReviewStep, 8);
    assert.equal(s.sceneProgress.buckramBindingStep, 2);
    assert.equal(s.sceneProgress.buckramBindingStatus, initial.sceneProgress.buckramBindingStatus);
    assert.deepEqual(s.completionStats.danneVariantsDefeated, initial.completionStats.danneVariantsDefeated);
  };
  if (!baseline) {
    await move(80, 164); await move(128, 111); await action();
    assert.equal((await state()).choice.options[0].value, "locked");
    await action();
    const locked = await shot("standards-seal-repair-route"); unchanged(locked);
    assert.match(locked.latestMessage, /WEST EXIT -> EDITOR DESK/);
    await cancel();
  }
  await move(80, 205); await move(20, 205); await action(); await scene("BlackVaultLairScene");
  await move(128, 214); await action(); await scene("SilentReadScene");
  await move(30, 202); await move(30, 124); await move(8, 124, "E1");
  await move(215, 185); await move(128, 185); await action();
  if (baseline) {
    await action(); const stuck = await shot("completed-desk-unresponsive");
    assert.equal(stuck.mode, "explore"); assert(document(stuck).undisclosedDeletion); unchanged(stuck);
    result.baseline = "Completed editor desk cannot reopen the damaged record";
  } else {
    assert.match((await shot("editor-reopened")).choice.title, /REPAIR: SOURCE NOTE 47/);
    await click(77, 158); assert(document(await state()).undisclosedDeletion);
    await shot("incomplete-proof-rejected");
    await action(); const repaired = await shot("bracket-drafted-unfiled");
    assert.equal(repaired.choice.options[0].value, "visible_italic");
    unchanged(repaired); assert(!document(repaired).editorialRepair);
    const frozen = s => ({ player: s.player, combat: s.playerCombat, threats: s.visibleThreats, points: s.documentPoints, reliability: s.reliability });
    await page.waitForTimeout(1200); assert.deepEqual(frozen(await state()), frozen(repaired));
    await cancel(); assert.equal((await state()).mode, "explore");
    assert.equal((await state()).playerCombat.weapon.swingId, repaired.playerCombat.weapon.swingId);
    await action(); await action(); await action();
    const draft = await shot("draft-filed-needs-proof"); unchanged(draft);
    assert.equal(document(draft).editorialRepair.status, "draft"); assert(document(draft).undisclosedDeletion);
    await resume("SilentReadScene"); unchanged(await shot("draft-continue"));
    assert.equal(document(await state()).editorialRepair.status, "draft");
    await move(215, 185); await move(215, 124); await move(248, 124, "S1");
    await move(30, 190); await move(194, 187); await action();
    const proof = await shot("proof-table-recheck"); unchanged(proof);
    assert.match(proof.choice.title, /RECHECK: SOURCE NOTE 47/);
    await context.storageState({ path: `${out}/pending-recheck-storage.json` });
    await cancel(); await resume("SilentReadScene");
    assert.deepEqual((await state()).player, proof.player);
    await action(); await action();
    const filed = await shot("correction-filed"); unchanged(filed);
    assert.equal(document(filed).editorialRepair.status, "proofed");
    assert.equal(document(filed).undisclosedDeletion, false); assert.equal(document(filed).annotationNeeded, false);
    await action(); unchanged(await state());
    await resume("SilentReadScene"); unchanged(await shot("filed-continue"));
    await move(215, 187); await move(215, 128); await move(246, 128, "BlackVaultLairScene"); await scene("BlackVaultLairScene");
    await move(128, 134); await action();
    for (let step = 0; step < 8 && (await state()).scene !== "EndingScene"; step++) await action();
    await scene("EndingScene");
    const returned = await shot("bindery-repaired-return"); unchanged(returned);
    await context.storageState({ path: `${out}/corrected-pending-seal-storage.json` });
    await move(80, 164); await move(128, 111); await action();
    assert.equal((await state()).mode, "choice");
    await action(); assert.equal((await state()).buckramBinding.completed, 3);
    await move(214, 119); await action(); assert.equal((await state()).buckramBinding.completed, 4);
    await move(214, 164); await action(); assert.equal((await state()).buckramBinding.completed, 5);
    await move(128, 164); await action(); await page.waitForTimeout(1700);
    const published = await shot("repaired-record-published");
    assert.equal(published.finalGateCertification.status, "published");
    assert.equal(published.documentPoints, initial.documentPoints + 24);
    await context.storageState({ path: `${out}/corrected-publication-storage.json` });
    await resume("EndingScene");
    assert.equal((await state()).documentPoints, published.documentPoints);
    assert.deepEqual((await state()).completionStats, published.completionStats);
    result.repair = { points: returned.documentPoints, indication: document(returned).editorialRepair,
      openViolations: returned.standardsViolations, publishedPoints: published.documentPoints };
  }
  assert.deepEqual(errors, []);
  console.log("PASS", baseline ? "baseline reproduced" : "correction, recheck, Continue, bindery return", mobile ? "touch" : "desktop");
} catch (error) { result.failure = String(error); console.error(error); process.exitCode = 1; }
finally { await writeFile(`${out}/result.json`, JSON.stringify({ ...result, errors }, null, 2)); await browser.close(); }
