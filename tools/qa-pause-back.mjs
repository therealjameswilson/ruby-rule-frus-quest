import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const storageState = JSON.parse(await readFile(process.env.FRUS_QA_STORAGE, 'utf8'));
const out = process.env.FRUS_QA_OUT ?? '/private/tmp/frus-pause-back';
const mobile = process.argv.includes('--mobile');
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE });
try {
  const context = await browser.newContext({ storageState, viewport: { width: 375, height: 667 }, hasTouch: mobile, isMobile: mobile, deviceScaleFactor: 3 });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  const state = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));
  const click = async (x, y) => {
    const box = await page.locator('canvas').first().boundingBox();
    const px = box.x + box.width * x / 256, py = box.y + box.height * y / 240;
    if (mobile) await page.touchscreen.tap(px, py); else await page.mouse.click(px, py);
    await page.waitForTimeout(180);
  };
  const shot = async name => {
    const image = await page.evaluate(() => new Promise(resolve => window.game.renderer.snapshot(i => resolve(i.src))));
    await writeFile(`${out}/${name}.png`, Buffer.from(image.split(',')[1], 'base64'));
    await writeFile(`${out}/${name}.json`, JSON.stringify(await state()));
  };
  await page.goto('http://127.0.0.1:5195/?text=full');
  await page.waitForFunction(() => window.game?.scene.isActive('TapToStartScene'));
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.game.scene.isActive('ArchiveScene'));
  await page.waitForTimeout(1000);
  const before = await state();
  await page.keyboard.press('Escape'); await page.waitForTimeout(250);
  const hit = (await state()).pauseMenu.controls.find(c => c.id === 'tool-8');
  await click(hit.x, hit.y); await click(hit.x, hit.y);
  assert.equal((await state()).pauseMenu.detailOpen, true);
  await shot('detail');
  // The mobile hardware-B path is separately exercised by the shared input tests;
  // the onscreen detail Back target is used here because pause hides touch buttons.
  if (mobile) {
    const back = (await state()).pauseMenu.controls.find(c => c.id === 'back');
    await click(back.x, back.y);
  } else await page.keyboard.press('x');
  await page.waitForTimeout(200); await shot('grid');
  assert.equal((await state()).pauseMenu?.detailOpen, false, 'Back returns to tools, not gameplay');
  if (mobile) {
    const close = (await state()).pauseMenu.controls.find(c => c.id === 'close');
    await click(close.x, close.y);
  } else await page.keyboard.press('x');
  await page.waitForTimeout(200);
  const after = await state();
  assert.equal(after.pauseMenu, null);
  assert.equal(after.playerCombat.weapon.swingId, before.playerCombat.weapon.swingId);
  assert.equal(after.documentPoints, before.documentPoints);
  assert.deepEqual(after.player, before.player);
  await page.keyboard.press('ArrowLeft', { delay: 180 });
  await page.waitForTimeout(100);
  assert((await state()).player.x < before.player.x, 'Movement resumes');
  await shot('resumed');
  assert.deepEqual(errors, []);
  console.log('Back restores grid, second back closes, no swing leaks, movement resumes');
} finally { await browser.close(); }
