import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
assert(process.env.FRUS_QA_STORAGE, 'Supply the earned pending-catalog-storage.json from qa-proof-comparison.mjs');
const out = process.env.FRUS_QA_OUT ?? '/tmp/frus-cross-reference-touch';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE });
const context = await browser.newContext({ storageState: JSON.parse(await readFile(process.env.FRUS_QA_STORAGE, 'utf8')),
  viewport: { width: 375, height: 667 }, hasTouch: true, isMobile: true, deviceScaleFactor: 3 });
const page = await context.newPage(), cdp = await context.newCDPSession(page), errors = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
const state = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));
async function touch(x, y, dx = 0, dy = 0) {
  const b = await page.locator('canvas').first().boundingBox();
  const point = (x, y) => ({ x: b.x + x * b.width / 256, y: b.y + y * b.height / 240, id: 1 });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point(x, y)] });
  if (dx || dy) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [point(x + dx, y + dy)] });
  await page.waitForTimeout(70);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(180);
}
try {
  await page.goto(`${process.env.FRUS_QA_URL ?? 'http://127.0.0.1:5195/'}?text=full`);
  await page.waitForFunction(() => window.render_game_to_text && JSON.parse(window.render_game_to_text()).scene === 'TapToStartScene');
  await touch(86,154);
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).scene === 'SilentReadScene');
  await page.waitForTimeout(200);
  await touch(225,205);
  const before = await state();
  assert.equal(before.choice.title, 'OPENNET / CROSS-REFERENCE');
  assert.equal(before.sceneProgress.silentReadCrossReferenceDraft ?? 0, 0);
  await touch(48, 202,26,0); // Floating D-pad moves focus, not the player or a filing action.
  assert.equal((await state()).sceneProgress.silentReadCrossReferenceDraft ?? 0, 0);
  await touch(225,205);
  assert.equal((await state()).sceneProgress.silentReadCrossReferenceDraft, 2);
  assert.equal((await state()).sceneProgress.silentReadReviewStatus, 2);
  await touch(174,216);
  assert.equal((await state()).mode, 'explore');
  assert.equal((await state()).sceneProgress.silentReadReviewStatus, 2);
  assert.equal((await state()).playerCombat.weapon.swingId, before.playerCombat.weapon.swingId);
  await touch(225,205);
  assert.equal((await state()).choice.options[1].value, 'pinned');
  await touch(48, 202,26,0); // Restored focus is the pinned card; next is the third card.
  await touch(48, 202,26,0); // Then the distinct filing command.
  await touch(225,205);
  const filed = await state();
  assert.equal(filed.sceneProgress.silentReadReviewStatus, 3);
  assert.equal(filed.sceneProgress['silentReadDecision_public-crossref'], 1);
  assert.equal(filed.documentPoints, before.documentPoints);
  assert.equal(filed.playerCombat.weapon.swingId, before.playerCombat.weapon.swingId);
  const image = await page.evaluate(() => new Promise(resolve => window.game.renderer.snapshot(i => resolve(i.src))));
  await writeFile(`${out}/filed-native.png`, Buffer.from(image.split(',')[1], 'base64'));
  await page.screenshot({ path: `${out}/filed.png` });
  assert.deepEqual(errors, []);
  await writeFile(`${out}/result.json`, JSON.stringify({ errors, before, filed }, null, 2));
  console.log('D-pad focus, A pin, B cancel, reopen, D-pad focus and A filing pass; no stamp or reward granted.');
} finally { await browser.close(); }
