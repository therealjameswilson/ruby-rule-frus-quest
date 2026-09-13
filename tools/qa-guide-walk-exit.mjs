import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const storageState = JSON.parse(await readFile(process.env.FRUS_QA_STORAGE, 'utf8'));
const out = process.env.FRUS_QA_OUT ?? '/private/tmp/frus-guide-walk-exit';
const mobile = process.argv.includes('--mobile');
const interact = process.argv.includes('--interact');
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE });
try {
  const context = await browser.newContext({ storageState, viewport: { width: 375, height: 667 }, hasTouch: mobile, isMobile: mobile, deviceScaleFactor: 3 });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text());
  });
  const state = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));
  const hold = async (key, ms) => {
    if (mobile) {
      const b = await page.locator('canvas').first().boundingBox();
      const [dx, dy] = { ArrowLeft: [-26, 0], ArrowRight: [26, 0], ArrowDown: [0, 26] }[key];
      const point = (x, y) => ({ x: b.x + b.width * x / 256, y: b.y + b.height * y / 240, id: 1 });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point(40, 164)] });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [point(40 + dx, 164 + dy)] });
      await page.waitForTimeout(ms);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    } else await page.keyboard.press(key, { delay: ms });
    await page.waitForTimeout(50);
  };
  await page.goto('http://127.0.0.1:5195/?text=full');
  await page.waitForFunction(() => window.game?.scene.isActive('TapToStartScene'));
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.game.scene.isActive('GuideScene'));
  await page.waitForTimeout(700);
  const before = await state();
  assert(before.volumeFragments.includes('Front Matter Fragment'));
  for (let i = 0; i < 12; i++) {
    const dx = 128 - (await state()).player.x;
    if (Math.abs(dx) < 3) break;
    await hold(dx < 0 ? 'ArrowLeft' : 'ArrowRight', Math.max(20, Math.min(160, Math.abs(dx) / 72 * 1000)));
  }
  if (interact) {
    await hold('ArrowDown', Math.max(0, (170 - (await state()).player.y) / 72 * 1000));
    await page.keyboard.press('Space');
  } else await hold('ArrowDown', 600);
  await page.waitForFunction(() => window.game.scene.isActive('ArchiveScene'), null, { timeout: 4000 });
  await page.waitForTimeout(600);
  assert.equal((await state()).documentPoints, before.documentPoints);
  const image = await page.evaluate(() => new Promise(resolve => window.game.renderer.snapshot(i => resolve(i.src))));
  await writeFile(`${out}/archive.png`, Buffer.from(image.split(',')[1], 'base64'));
  await page.waitForTimeout(2200);
  const arrived = await state();
  assert.equal(arrived.mode, 'explore');
  assert.equal(arrived.roomTraversal.currentRoomId, 'A1');
  if (mobile) {
    const b = await page.locator('canvas').first().boundingBox();
    await page.touchscreen.tap(b.x + b.width * 225 / 256, b.y + b.height * 205 / 240);
  } else await page.keyboard.press('Space');
  await page.waitForTimeout(300);
  const collected = await state();
  assert.equal(collected.heldItem, 'Source Note 47', 'First Archive action must collect the nearby note');
  assert.equal(collected.documentPoints, before.documentPoints + 2);
  assert.equal(collected.mode, 'explore', 'Pickup explanation must not trap movement in a dialog');
  await hold('ArrowLeft', 180);
  const moving = await state();
  assert(moving.player.x < collected.player.x - 4, 'Player can move immediately after pickup');
  const pickup = await page.evaluate(() => new Promise(resolve => window.game.renderer.snapshot(i => resolve(i.src))));
  await writeFile(`${out}/pickup.png`, Buffer.from(pickup.split(',')[1], 'base64'));
  await writeFile(`${out}/result.json`, JSON.stringify({ arrived, collected, moving, errors }, null, 2));
  assert.deepEqual(errors, []);
  console.log(`Earned Guide gate exits via ${interact ? 'interaction' : mobile ? 'touch walking' : 'keyboard walking'}; first Archive pickup and movement work`);
} finally { await browser.close(); }
