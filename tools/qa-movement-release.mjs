import { touchPad } from "./touch-pad-fixture.mjs";
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const out = process.env.FRUS_QA_OUT ?? '/tmp/frus-movement-release';
const baseline = process.argv.includes('--baseline');
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE });
const results = [];
try {
  for (const mobile of [false, true]) {
    const page = await browser.newPage(mobile ? { viewport: { width: 375, height: 667 }, hasTouch: true, isMobile: true, deviceScaleFactor: 3 } : {});
    const errors = [], cdp = await page.context().newCDPSession(page);
    page.on('pageerror', e => errors.push(String(e)));
    await page.goto(`${process.env.FRUS_QA_URL ?? 'http://127.0.0.1:5211/'}?scene=OfficeScene&text=full`);
    await page.waitForFunction(() => window.game?.scene?.getScene('OfficeScene')?.player);
    await page.waitForTimeout(1200);
    const position = () => page.evaluate(() => window.game.scene.getScene('OfficeScene').player.position);
    const before = await position();
    if (mobile) {
      const b = await page.locator('canvas').first().boundingBox();
      const p = x => ({ x: b.x + x * b.width / 256, y: b.y + touchPad.y * b.height / 240, id: 1 });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [p(touchPad.x)] });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [p(touchPad.x + 26)] });
      await page.waitForTimeout(30);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    } else {
      await page.keyboard.down('ArrowRight'); await page.waitForTimeout(30); await page.keyboard.up('ArrowRight');
    }
    const released = await position();
    await page.waitForTimeout(220);
    const settled = await position();
    const result = { input: mobile ? 'touch' : 'keyboard', before, released, settled, drift: settled.x - released.x, errors };
    results.push(result);
    await page.screenshot({ path: `${out}/${result.input}-screen.png` });
    const image = await page.evaluate(() => new Promise(resolve => window.game.renderer.snapshot(i => resolve(i.src))));
    await writeFile(`${out}/${result.input}.png`, Buffer.from(image.split(',')[1], 'base64'));
    if (!baseline) {
      assert(released.x > before.x, 'Short held input must move the hero');
      assert.deepEqual(settled, released, 'Release must not coast through the remaining tap latch');
      assert.deepEqual(errors, []);
    }
    await page.close();
  }
} finally {
  await writeFile(`${out}/results.json`, JSON.stringify(results, null, 2));
  await browser.close();
}
console.log(JSON.stringify(results, null, 2));
