import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { workstationWalkRoute } from "../src/game/workstationGeometry.ts";
const referralWalkRoute = (from, to, solids) => workstationWalkRoute(from, to, solids, {x:[30,98,160,226],y:[96,180]});
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const base = process.env.FRUS_QA_URL ?? "http://127.0.0.1:5195/";
const out = process.env.FRUS_QA_OUT ?? "/tmp/frus-danne-contact";
const observe = process.argv.includes("--observe");
const mobile = process.argv.includes("--mobile");
assert(process.env.FRUS_QA_STORAGE, "Provide an earned Referral entry save");
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true,
  ...(process.env.CHROMIUM_EXECUTABLE ? { executablePath: process.env.CHROMIUM_EXECUTABLE } : {}) });
const context = await browser.newContext({ storageState: JSON.parse(await readFile(process.env.FRUS_QA_STORAGE, "utf8")),
  viewport: mobile ? { width: 375, height: 667 } : { width: 1024, height: 960 },
  hasTouch: mobile, isMobile: mobile, deviceScaleFactor: mobile ? 3 : 1 });
const page = await context.newPage(), cdp = await context.newCDPSession(page), errors = [];
page.on("pageerror", e => errors.push(String(e)));
page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
const state = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));
async function touch(x, y, dx = 0, dy = 0, duration = 48) {
  const b = await page.locator("canvas").first().boundingBox();
  const point = (x, y) => ({ x: b.x + x * b.width / 256, y: b.y + y * b.height / 240, id: 1 });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [point(x, y)] });
  if (dx || dy) await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [point(x + dx, y + dy)] });
  await page.waitForTimeout(duration);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
}
async function direction(key, duration = 80) {
  if (mobile) {
    const [dx, dy] = { ArrowLeft: [-26, 0], ArrowRight: [26, 0], ArrowUp: [0, -26], ArrowDown: [0, 26] }[key];
    await touch(40, 178, dx, dy, duration);
  } else {
    await page.keyboard.down(key); await page.waitForTimeout(duration); await page.keyboard.up(key);
  }
  await page.waitForTimeout(25);
}
async function swingToward(key) {
  if (mobile) {
    const b = await page.locator("canvas").first().boundingBox();
    const point = (x, y, id) => ({ x: b.x + x * b.width / 256, y: b.y + y * b.height / 240, id });
    const [dx, dy] = { ArrowLeft: [-26, 0], ArrowRight: [26, 0], ArrowUp: [0, -26], ArrowDown: [0, 26] }[key];
    const pad = point(40 + dx, 178 + dy, 1);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [point(40, 178, 1)] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [pad] });
    await page.waitForTimeout(30);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [pad, point(174, 216, 2)] });
    await page.waitForTimeout(48);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  } else {
    await page.keyboard.down(key);
    await page.waitForTimeout(30);
    await page.keyboard.press("x", { delay: 48 });
    await page.keyboard.up(key);
  }
  await page.waitForTimeout(160);
}
async function stepToward(x, y) {
  const {p,solids}=await page.evaluate(()=>{const scene=window.game.scene.getScene("ReferralVaultScene");return {
    p:{x:scene.player.logicalX,y:scene.player.logicalY},
    solids:scene.roomSolids.map(({x,y,width,height})=>({x,y,width,height}))};});
  if (Math.hypot(x-p.x, y-p.y) < 3) { await page.waitForTimeout(100); return; }
  const route=referralWalkRoute(p,{x,y},solids);
  const target=route.find(point=>Math.hypot(point.x-p.x,point.y-p.y)>2) ?? route.at(-1);
  assert(target,`No aisle to patrol at ${x},${y}`);
  const dx=target.x-p.x,dy=target.y-p.y;
  await direction(Math.abs(dx) > Math.abs(dy) ? dx > 0 ? "ArrowRight" : "ArrowLeft" : dy > 0 ? "ArrowDown" : "ArrowUp");
}
async function shot(name) {
  const s = await state();
  const native = await page.evaluate(() => new Promise(resolve => window.game.renderer.snapshot(image => resolve(image.src))));
  await writeFile(`${out}/${name}-native.png`, Buffer.from(native.split(",")[1], "base64"));
  await page.screenshot({ path: `${out}/${name}.png` });
  await writeFile(`${out}/${name}.json`, JSON.stringify(s, null, 2));
}
try {
  await page.goto(`${base}?text=full`);
  await page.waitForFunction(() => window.render_game_to_text && JSON.parse(window.render_game_to_text()).scene === "TapToStartScene");
  if (mobile) await touch(86, 154); else await page.keyboard.press("Enter", { delay: 48 });
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).scene === "ReferralVaultScene");
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    const scene = window.game.scene.getScene("ReferralVaultScene"), lurker = scene.danneLurker;
    const original = lurker.update.bind(lurker);
    window.contactTrace = [];
    window.safePassFrames = 0;
    let pending = null;
    // Observe the real update before knockback. Do not change its inputs or results.
    lurker.update = (...args) => {
      const player = { ...args[2] }, result = original(...args);
      const body = lurker.bodyBounds(), foot = { x: player.x - 8, y: player.y - 3, width: 16, height: 8 };
      const overlap = foot.x <= body.x + body.width && foot.x + foot.width >= body.x
        && foot.y <= body.y + body.height && foot.y + foot.height >= body.y;
      if (args[3] && !overlap && !result.triggered && Math.hypot(player.x - lurker.position.x, player.y - lurker.position.y) <= 25) {
        window.safePassFrames++;
      }
      if (result.triggered) {
        pending = { time: args[0], player, enemy: { ...lurker.position }, body: { x: body.x, y: body.y, width: body.width, height: body.height }, foot,
          overlap, reliabilityBefore: JSON.parse(window.render_game_to_text()).reliability };
      }
      return result;
    };
    scene.events.on("postupdate", () => {
      if (pending) {
        pending.reliabilityAfter = JSON.parse(window.render_game_to_text()).reliability;
        window.contactTrace.push(pending); pending = null;
      }
    });
  });
  const before = await state();
  await shot("entry");
  for (let i = 0; i < 150; i++) {
    await stepToward(92, 164);
    if (await page.evaluate(() => window.contactTrace.some(hit => !hit.overlap && hit.reliabilityAfter < hit.reliabilityBefore))) break;
  }
  await shot("passing-patrol");
  // Then deliberately touch him: removing phantom hits must not disable contact damage.
  for (let i = 0; i < 150; i++) {
    if (await page.evaluate(() => window.contactTrace.some(hit => hit.overlap && hit.reliabilityAfter < hit.reliabilityBefore))) break;
    const enemy = (await state()).visibleThreats.find(threat => threat.label === "DANN-E LURKER");
    await stepToward(enemy.x, enemy.y);
  }
  await shot("actual-contact");
  if (!observe) {
    for (let i = 0; i < 120; i++) {
      const s = await state(), enemy = s.visibleThreats.find(threat => threat.label === "DANN-E LURKER");
      if (enemy.counterplay.toolCounters > 0) break;
      const dx = enemy.x - s.player.x, dy = enemy.y - s.player.y;
      if (Math.hypot(dx, dy) > 30 || !s.playerCombat.weapon.canSwing) await stepToward(enemy.x, enemy.y);
      else await swingToward(Math.abs(dx) > Math.abs(dy) ? dx > 0 ? "ArrowRight" : "ArrowLeft" : dy > 0 ? "ArrowDown" : "ArrowUp");
    }
    const countered = await state(), enemy = countered.visibleThreats.find(threat => threat.label === "DANN-E LURKER");
    assert.equal(countered.playerCombat.weapon.tool, "citation_stamp");
    assert(enemy.counterplay.toolCounters > 0, "An earned Citation Stamp must interrupt DANN-E");
    assert(enemy.counterplay.stunnedMsRemaining > 0);
    await shot("tool-counter");
  }
  const trace = await page.evaluate(() => window.contactTrace);
  const after = await state();
  await writeFile(`${out}/contact-trace.json`, JSON.stringify(trace, null, 2));
  assert.deepEqual(after.documentCandidates, before.documentCandidates);
  assert.equal(after.documentPoints, before.documentPoints);
  assert.deepEqual(after.standardsViolations, before.standardsViolations);
  const phantom = trace.filter(hit => !hit.overlap && hit.reliabilityAfter < hit.reliabilityBefore);
  const contacts = trace.filter(hit => hit.overlap && hit.reliabilityAfter < hit.reliabilityBefore);
  const safePassFrames = await page.evaluate(() => window.safePassFrames);
  const summary = { phantomHits: phantom.length, actualContacts: contacts.length, safePassFrames };
  await writeFile(`${out}/summary.json`, JSON.stringify(summary, null, 2));
  console.log(JSON.stringify({ ...summary, trace }));
  if (!observe) {
    assert.equal(phantom.length, 0, "Contact damage requires actual body overlap");
    assert(contacts.length > 0, "Actual contact must still cause damage");
    assert(safePassFrames > 0, "The replay must actually pass close to the patrol without touching");
  }
  assert.deepEqual(errors, []);
} finally {
  await writeFile(`${out}/errors.json`, JSON.stringify(errors, null, 2));
  await browser.close();
}
