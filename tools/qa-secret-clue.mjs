import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const out = process.env.FRUS_QA_OUT ?? '/private/tmp/frus-secret-clue';
const mobile = process.argv.includes('--mobile');
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE });
try {
  const page = await browser.newPage({ viewport: mobile ? { width: 375, height: 667 } : { width: 1024, height: 900 },
    hasTouch: mobile, isMobile: mobile, deviceScaleFactor: mobile ? 3 : 1 });
  const cdp = await page.context().newCDPSession(page);
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  const state = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));
  const action = async () => {
    if (mobile) {
      const b = await page.locator('canvas').first().boundingBox();
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: b.x + 225 * b.width / 256, y: b.y + 205 * b.height / 240, id: 1 }] });
      await page.waitForTimeout(40);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    } else await page.keyboard.press('Space', { delay: 40 });
    await page.waitForTimeout(100);
  };
  const shot = async name => {
    const image = await page.evaluate(() => new Promise(resolve => window.game.renderer.snapshot(i => resolve(i.src))));
    await writeFile(`${out}/${name}.png`, Buffer.from(image.split(',')[1], 'base64'));
  };
  await page.goto('http://127.0.0.1:5195/?scene=NaraStacksScene&text=full');
  await page.waitForFunction(() => window.render_game_to_text && JSON.parse(window.render_game_to_text()).scene === 'NaraStacksScene');
  await page.waitForTimeout(1500);
  assert.equal((await state()).nearestInteractable, 'Patrol Note 1/2');
  await action();
  await page.waitForTimeout(2200);
  await shot('next-clue');
  assert.equal((await state()).nearestInteractable, 'Shelf Clue 2/2');
  await action();
  await shot('shelf-clue');
  const text = await page.evaluate(() => window.game.scene.getScene('NaraStacksScene').children.list
    .filter(o => o.type === 'Container' && o.visible).flatMap(o => o.list ?? [])
    .filter(o => typeof o.text === 'string').map(o => o.text));
  assert.ok(text.includes('NE SHELF: REVIEW FOLDER'));
  assert.equal((await state()).nearestInteractable, 'Patrol Note 1/2');
  assert.ok(!(await state()).sceneProgress.hiddenReadingRoomDiscovered);
  assert.deepEqual(errors, []);
  await writeFile(`${out}/result.json`, JSON.stringify({ text, errors, discoveryGranted: false }, null, 2));
  console.log('The note advertises its second clue; reading it does not unlock the secret');
} finally { await browser.close(); }
