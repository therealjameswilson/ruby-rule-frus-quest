// Uses earned decision checkpoints from qa-proof-comparison.mjs; no gameplay injection.
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const root = process.env.FRUS_QA_DECISIONS;
assert(root, 'Supply the desktop/mobile directory containing pending-decision-N-storage.json');
const out = process.env.FRUS_QA_OUT ?? '/tmp/frus-proof-decision-cancel';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE });
const errors = [];
try {
  for (const [step, correct] of [[3, 0], [5, 1], [6, 0]]) {
    const context = await browser.newContext({
      storageState: JSON.parse(await readFile(`${root}/pending-decision-${step}-storage.json`, 'utf8')),
      viewport: { width: 375, height: 667 }, hasTouch: true, isMobile: true, deviceScaleFactor: 3
    });
    const page = await context.newPage(), cdp = await context.newCDPSession(page);
    page.on('pageerror', error => errors.push(String(error)));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    const state = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));
    const tap = async (x, y) => {
      const bounds = await page.locator('canvas').first().boundingBox();
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [
        { id: 1, x: bounds.x + x * bounds.width / 256, y: bounds.y + y * bounds.height / 240 }
      ] });
      await page.waitForTimeout(50);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await page.waitForTimeout(180);
    };
    const option = async index => {
      const center = await page.evaluate(index => {
        const row = window.game.scene.getScene('SilentReadScene').reviewChoice.optionObjects[index * 2].getBounds();
        return { x: row.centerX, y: row.centerY };
      }, index);
      await tap(center.x, center.y);
    };
    await page.goto(new URL('?text=full', process.env.FRUS_QA_URL ?? 'http://127.0.0.1:5195/').href);
    await page.waitForFunction(() => window.render_game_to_text && JSON.parse(window.render_game_to_text()).scene === 'TapToStartScene');
    await tap(86, 154);
    await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).scene === 'SilentReadScene');
    await page.waitForTimeout(850);
    await tap(225, 205);
    const before = await state();
    assert.equal(before.mode, 'choice');
    assert.equal(before.sceneProgress.silentReadReviewStep, step);
    const unchanged = async () => {
      const after = await state();
      assert.equal(after.mode, 'explore');
      assert.deepEqual(after.sceneProgress, before.sceneProgress);
      assert.deepEqual(after.documentCandidates, before.documentCandidates);
      assert.equal(after.documentPoints, before.documentPoints);
      assert.equal(after.playerCombat.weapon.swingId, before.playerCombat.weapon.swingId);
    };
    await tap(224, 16); await unchanged();
    await tap(225, 205); assert.equal((await state()).mode, 'choice');
    await option(2); await unchanged();
    await tap(225, 205); assert.equal((await state()).mode, 'choice');
    const image = await page.evaluate(() => new Promise(resolve => window.game.renderer.snapshot(image => resolve(image.src))));
    await writeFile(`${out}/decision-${step}-native.png`, Buffer.from(image.split(',')[1], 'base64'));
    await page.screenshot({ path: `${out}/decision-${step}.png` });
    await option(correct);
    const verified = await state();
    assert.equal(verified.sceneProgress.silentReadReviewStatus, 3);
    assert.equal(verified.documentPoints, before.documentPoints, 'Approval alone must not stamp');
    await writeFile(`${out}/decision-${step}.json`, JSON.stringify(verified, null, 2));
    await context.close();
  }
  assert.deepEqual(errors, []);
  console.log('PASS touch: Start/Back cancel all three decisions; deliberate answers verify without stamping');
} finally {
  await writeFile(`${out}/errors.json`, JSON.stringify(errors));
  await browser.close();
}
