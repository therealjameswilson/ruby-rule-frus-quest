import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const out = process.env.FRUS_QA_OUT ?? '/private/tmp/frus-doorway-idle';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE });
const results = [];
try {
  for (const [sceneKey, target, x] of [['ArchiveScene', 'OfficeScene', 8],
    ['NetworkScene', 'ArchiveScene', 32], ['ReferralVaultScene', 'NetworkScene', 14],
    ['SilentReadScene', 'ReferralVaultScene', 14]]) {
    const context = await browser.newContext({ viewport: { width: 375, height: 667 }, hasTouch: true,
      isMobile: true, deviceScaleFactor: 3 });
    const page = await context.newPage(), cdp = await context.newCDPSession(page), errors = [];
    page.on('pageerror', error => errors.push(String(error)));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.goto(`http://127.0.0.1:5195/?scene=${sceneKey}&text=full`);
    await page.waitForFunction(key => window.game?.scene.isActive(key), sceneKey);
    await page.waitForTimeout(800);
    // Isolated recovery fixture: reproduce a saved position on the threshold.
    // Progression is not granted, and the actual exit is exercised with touch.
    await page.evaluate(({ key, x }) => window.game.scene.getScene(key).player.setPosition(x, 124), { key: sceneKey, x });
    await page.waitForTimeout(1500);
    assert.equal(await page.evaluate(() => JSON.parse(window.render_game_to_text()).scene), sceneKey,
      `${sceneKey}: an idle doorway position must not change chapters`);
    const image = await page.evaluate(() => new Promise(resolve => window.game.renderer.snapshot(i => resolve(i.src))));
    await writeFile(`${out}/${sceneKey}-idle.png`, Buffer.from(image.split(',')[1], 'base64'));
    const box = await page.locator('canvas').first().boundingBox();
    const point = x => ({ x: box.x + x * box.width / 256, y: box.y + 178 * box.height / 240, id: 1 });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point(40)] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [point(14)] });
    // Network's arrival is 18px inside the threshold; allow time to walk out.
    await page.waitForTimeout(350);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForFunction(key => window.game.scene.isActive(key), target);
    await page.waitForTimeout(500);
    assert.deepEqual(errors, []);
    results.push({ sceneKey, target, idleStayed: true, touchExitWorked: true, errors });
    await context.close();
  }
} finally {
  await writeFile(`${out}/results.json`, JSON.stringify(results, null, 2));
  await browser.close();
}
console.log(JSON.stringify(results, null, 2));
