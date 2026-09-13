import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const out = process.env.FRUS_QA_OUT ?? '/private/tmp/frus-inventory-demand';
const viewport = process.argv.includes('--landscape') ? { width: 667, height: 375 } : { width: 375, height: 667 };
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE });
try {
  const context = await browser.newContext({ storageState: process.env.FRUS_QA_STORAGE, viewport, hasTouch: true,
    isMobile: true, deviceScaleFactor: 3 });
  const page = await context.newPage(), cdp = await context.newCDPSession(page), errors = [], requests = [];
  page.on('pageerror', error => errors.push(String(error)));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.route(/(?:danne-pack\/items\/|06_inventory_row_six\.png)/, async route => {
    requests.push(route.request().url());
    await new Promise(resolve => setTimeout(resolve, 3000));
    await route.continue();
  });
  const state = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));
  const tap = async (x, y) => {
    const b = await page.locator('canvas').first().boundingBox();
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [
      { x: b.x + x * b.width / 256, y: b.y + y * b.height / 240, id: 1 }] });
    await page.waitForTimeout(60);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(100);
  };
  const shot = async name => {
    const src = await page.evaluate(() => new Promise(resolve => window.game.renderer.snapshot(i => resolve(i.src))));
    await writeFile(`${out}/${name}.png`, Buffer.from(src.split(',')[1], 'base64'));
  };
  await page.goto(`http://127.0.0.1:5195/?${process.env.FRUS_QA_STORAGE ? '' : 'scene=ArchiveScene&'}text=full`);
  if (process.env.FRUS_QA_STORAGE) {
    await page.waitForFunction(() => window.game?.scene.isActive('TapToStartScene'));
    await tap(86, 154);
  }
  await page.waitForFunction(() => window.render_game_to_text && JSON.parse(window.render_game_to_text()).mode === 'explore');
  await page.waitForTimeout(700);
  assert.equal(requests.length, 0, 'No menu art is fetched before opening pause');
  await tap(224, 16);
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).mode === 'pause');
  await page.waitForFunction(() => window.game.scene.getScene(JSON.parse(window.render_game_to_text()).scene).children.list
    .some(node => node.name === 'pause-menu' && node.visible));
  await shot('loading');
  const paused = await state();
  await page.waitForTimeout(700);
  const held = await state();
  assert.deepEqual(held.player, paused.player);
  assert.deepEqual(held.visibleThreats, paused.visibleThreats);
  assert.equal(held.documentPoints, paused.documentPoints);
  // Core tools must remain selectable even before optional card PNGs arrive.
  assert.equal(await page.evaluate(() => window.game.textures.exists('danne-item-treaty-fragments')), false);
  await tap(152, 80); await tap(152, 80);
  if (process.env.FRUS_QA_STORAGE) {
    const equipped = await page.evaluate(async () => {
      const { getProcessItemReadout } = await import('/src/game/state.ts');
      return getProcessItemReadout().find(item => item.equipped)?.id;
    });
    assert.equal(equipped, 'review_folder');
    await shot('equipped-before-art');
  }
  await tap(224, 34);
  assert.equal((await state()).mode, 'explore');
  await page.waitForFunction(() => window.game.textures.exists('ui_row_six')
    && window.game.textures.exists('danne-item-treaty-fragments'));
  await page.waitForTimeout(200);
  assert.equal((await state()).mode, 'explore', 'Late completion must not reopen pause');
  await tap(224, 16);
  await shot('loaded');
  assert.equal(requests.length, 4, 'Reopening uses the four cached menu assets');
  for (const key of ['danne-item-ruby-pen', 'danne-item-master-declass-key', 'danne-item-treaty-fragments']) {
    assert(await page.evaluate(key => window.game.textures.exists(`${key}-thumb16`), key));
  }
  await tap(224, 34);
  assert.equal((await state()).mode, 'explore');
  assert.deepEqual(errors, []);
  await writeFile(`${out}/result.json`, JSON.stringify({ viewport, requests, errors, pauseFrozen: true, lateCompletionStayedClosed: true }, null, 2));
  console.log('PASS cold menu loading, pause freeze, early close, cached reopen and all item thumbnails');
} finally { await browser.close(); }
