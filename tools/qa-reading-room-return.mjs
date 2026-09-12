// Debug-room fixture; collection and return use actual player input, not save edits.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const out = process.env.FRUS_QA_OUT ?? '/private/tmp/frus-reading-room';
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
  const hold = async (key, ms) => {
    if (!mobile) { await page.keyboard.down(key); await page.waitForTimeout(ms); await page.keyboard.up(key); return; }
    const b = await page.locator('canvas').first().boundingBox();
    const p = dy => ({ x: b.x + 40 * b.width / 256, y: b.y + (178 + dy) * b.height / 240, id: 1 });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [p(0)] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [p(key === 'ArrowUp' ? -26 : 26)] });
    await page.waitForTimeout(ms);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  };
  const action = async () => {
    if (!mobile) { await page.keyboard.press('Space'); return; }
    const b = await page.locator('canvas').first().boundingBox();
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: b.x + 225 * b.width / 256, y: b.y + 205 * b.height / 240, id: 2 }] });
    await page.waitForTimeout(60);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  };
  const shot = async name => {
    const image = await page.evaluate(() => new Promise(resolve => window.game.renderer.snapshot(i => resolve(i.src))));
    await writeFile(`${out}/${name}.png`, Buffer.from(image.split(',')[1], 'base64'));
  };
  await page.goto('http://127.0.0.1:5195/?scene=HiddenReadingRoomScene&text=full');
  await page.waitForFunction(() => window.render_game_to_text && JSON.parse(window.render_game_to_text()).scene === 'HiddenReadingRoomScene');
  await page.waitForTimeout(1700);
  const initial = await state();
  await hold('ArrowUp', 850);
  await action();
  await page.waitForTimeout(500);
  const collected = await state();
  await shot('collected');
  assert.equal(collected.sceneProgress.hiddenFirstEditionFound, 1);
  assert.equal(collected.documentPoints, initial.documentPoints + 25);
  await hold('ArrowDown', 1200);
  await page.waitForTimeout(800);
  const returned = await state();
  await shot('return');
  await writeFile(`${out}/result.json`, JSON.stringify({ initial: initial.documentPoints, collected: collected.documentPoints,
    scene: returned.scene, player: returned.player, errors }, null, 2));
  assert.equal(returned.scene, 'NaraStacksScene', 'Walking through the south threshold should return to the stacks');
  assert.equal(returned.sceneProgress.hiddenFirstEditionFound, 1);
  assert.equal(returned.documentPoints, collected.documentPoints);
  await hold('ArrowUp', 400);
  await page.waitForTimeout(1200);
  assert.equal((await state()).scene, 'HiddenReadingRoomScene');
  await hold('ArrowUp', 850);
  await action();
  assert.equal((await state()).documentPoints, collected.documentPoints, 'Revisiting must not duplicate the bonus');
  const save = await page.evaluate(() => JSON.parse(localStorage.getItem('rubyRuleFrusQuestSave')));
  assert.equal(save.state.sceneProgress.hiddenFirstEditionFound, 1);
  await shot('revisited');
  assert.deepEqual(errors, []);
  console.log(`${mobile ? 'Touch' : 'Keyboard'}: first edition +25, south walk returns, revisit gives no duplicate, reward saved`);
} finally { await browser.close(); }
