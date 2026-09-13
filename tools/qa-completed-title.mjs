import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
assert(process.env.FRUS_QA_STORAGE, 'Supply an earned published save');
const out = process.env.FRUS_QA_OUT ?? '/private/tmp/frus-completed-title';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE });
const context = await browser.newContext({ storageState: process.env.FRUS_QA_STORAGE,
  viewport: { width: 375, height: 667 }, hasTouch: true, isMobile: true, deviceScaleFactor: 3 });
const page = await context.newPage(), cdp = await context.newCDPSession(page), errors = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
const state = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));
async function tap(x, y) {
  const box = await page.locator('canvas').first().boundingBox();
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{
    x: box.x + x * box.width / 256, y: box.y + y * box.height / 240, id: 1 }] });
  await page.waitForTimeout(50);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(150);
}
async function shot(name) {
  const image = await page.evaluate(() => new Promise(resolve => window.game.renderer.snapshot(image => resolve(image.src))));
  await writeFile(`${out}/${name}.png`, Buffer.from(image.split(',')[1], 'base64'));
  await writeFile(`${out}/${name}.json`, JSON.stringify(await state(), null, 2));
}
try {
  await page.goto('http://127.0.0.1:5195/?text=full');
  await page.waitForFunction(() => window.render_game_to_text && JSON.parse(window.render_game_to_text()).scene === 'TapToStartScene');
  await tap(86,154);
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).scene === 'EndingScene');
  await page.waitForTimeout(800);
  const published = await state();
  assert.equal(published.finalGateCertification.status, 'published');
  await tap(190,216);
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).scene === 'TitleScene');
  await page.waitForTimeout(700);
  await shot('completed-title');
  assert((await state()).newGamePlus.unlocked);
  await tap(181,207);
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).scene === 'CharacterCreateScene');
  const next = await state();
  assert.equal(next.newGamePlus.active, true);
  assert.equal(next.newGamePlus.volumesCompleted, published.newGamePlus.volumesCompleted);
  await shot('new-game-plus');
  await tap(128,192);
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).scene === 'OfficeScene');
  await page.waitForTimeout(800);
  const office = await state();
  assert.equal(office.newGamePlus.active, true);
  assert.equal(office.newGamePlus.volumesCompleted, published.newGamePlus.volumesCompleted);
  assert.equal(office.documentPoints, 0);
  assert(!office.inventory.includes('Proof Lens'));
  assert.equal(office.finalGateCertification, null);
  await shot('fresh-office');
  await page.reload();
  await page.waitForFunction(() => window.render_game_to_text && JSON.parse(window.render_game_to_text()).scene === 'TapToStartScene');
  await tap(86,154);
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).scene === 'OfficeScene');
  assert.equal((await state()).newGamePlus.active, true);
  assert.equal((await state()).newGamePlus.volumesCompleted, published.newGamePlus.volumesCompleted);
  await shot('fresh-office-reloaded');
  for (const [key, frames] of [
    ['ArrowUp', [6, 7]], ['ArrowLeft', [8, 9]],
    ['ArrowRight', [10, 11]], ['ArrowDown', [4, 5]]
  ]) {
    const before = await page.evaluate(() => {
      const sprite = window.game.scene.getScene('OfficeScene').player.sprite;
      return { x: sprite.x, y: sprite.y };
    });
    await page.keyboard.down(key);
    await page.waitForTimeout(180);
    const pose = await page.evaluate(() => {
      const sprite = window.game.scene.getScene('OfficeScene').player.sprite;
      return { key: sprite.texture.key, frame: Number(sprite.frame.name), x: sprite.x, y: sprite.y };
    });
    assert.equal(pose.key, 'compiler_veteran');
    assert(frames.includes(pose.frame), `${key} uses its walk poses`);
    assert(Number.isInteger(pose.x) && Number.isInteger(pose.y), 'Render position is pixel-snapped');
    assert(Math.hypot(pose.x - before.x, pose.y - before.y) > 3, `${key} moves the hero`);
    await shot(`veteran-${key}`);
    await page.keyboard.up(key);
    await page.waitForTimeout(80);
  }
  assert.deepEqual(errors, []);
  console.log('PASS earned publication -> title -> touch New Game+ -> fresh Office -> reload, completion count preserved');
} finally { await browser.close(); }
