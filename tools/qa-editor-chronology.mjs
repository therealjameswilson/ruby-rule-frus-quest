import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright");
assert(process.env.FRUS_QA_STORAGE, "Supply pending-chronology-storage.json from the earned chapter replay.");
const out = process.env.FRUS_QA_OUT ?? "/tmp/frus-editor-chronology";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE });
const errors = [];
try {
  const context = await browser.newContext({ storageState: JSON.parse(await readFile(process.env.FRUS_QA_STORAGE, "utf8")),
    viewport: { width: 375, height: 667 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  const page = await context.newPage(), cdp = await context.newCDPSession(page);
  page.on("pageerror", e => errors.push(String(e)));
  page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
  const state = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));
  async function tap(x, y) {
    const b = await page.locator("canvas:not(#pixel-proof-overlay)").boundingBox();
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ id: 1, x: b.x + x * b.width / 256, y: b.y + y * b.height / 240 }] });
    await page.waitForTimeout(60);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await page.waitForTimeout(220);
  }
  async function shot(name) {
    const image = await page.evaluate(() => new Promise(resolve => window.game.renderer.snapshot(image => resolve(image.src))));
    await writeFile(`${out}/${name}-native.png`, Buffer.from(image.split(",")[1], "base64"));
    await page.screenshot({ path: `${out}/${name}.png` });
    await writeFile(`${out}/${name}.json`, JSON.stringify(await state(), null, 2));
  }
  await page.goto(process.env.FRUS_QA_URL ?? "http://127.0.0.1:5195/?text=full");
  await page.waitForFunction(() => window.render_game_to_text && JSON.parse(window.render_game_to_text()).scene === "TapToStartScene");
  await tap(86, 154);
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).scene === "SilentReadScene");
  await page.waitForTimeout(950); await tap(225, 205);
  const initial = await state();
  assert.equal(initial.choice.title, "REPAIR THE CHRONOLOGY");
  await shot("open");
  await tap(104, 168); assert.equal((await state()).sceneProgress.silentReadReviewStatus, 2);
  await tap(34, 168); assert.equal((await state()).sceneProgress.silentReadChronologySlot, 2);
  await shot("correct-unfiled");
  await tap(104, 168);
  const filed = await state();
  assert.equal(filed.sceneProgress.silentReadReviewStatus, 3);
  assert.equal(filed.sceneProgress["silentReadDecision_proof-date"], 1);
  assert.equal(filed.documentPoints, initial.documentPoints);
  assert.deepEqual(filed.inventory, initial.inventory);
  await shot("filed");
  assert.deepEqual(errors, []);
  await writeFile(`${out}/result.json`, JSON.stringify({ errors, points: filed.documentPoints, status: filed.sceneProgress.silentReadReviewStatus }));
} finally { await browser.close(); }
