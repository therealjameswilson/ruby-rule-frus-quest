import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const out = process.env.FRUS_QA_OUT ?? '/tmp/frus-controller-handoff';
const mobile = process.argv.includes('--mobile');
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE });
try {
  const page = await browser.newPage(mobile
    ? { viewport: { width: 375, height: 667 }, hasTouch: true, isMobile: true, deviceScaleFactor: 3 } : {});
  const errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  // Browser Gamepad API fixture, not a claim of physical Bluetooth testing.
  await page.addInitScript(() => {
    window.qaPad = { connected: true, index: 0, id: 'QA standard controller',
      mapping: 'standard', axes: [0, 0], buttons: Array.from({ length: 16 }, () => ({ pressed: false, value: 0 })) };
    Object.defineProperty(navigator, 'getGamepads', { value: () => window.qaPad.connected ? [window.qaPad] : [] });
  });
  await page.goto(`${process.env.FRUS_QA_URL ?? 'http://127.0.0.1:5195/'}?scene=OfficeScene&text=full`);
  await page.waitForFunction(() => window.game?.scene.getScene('OfficeScene')?.player);
  await page.waitForTimeout(1200);
  if (mobile) assert.equal(await page.evaluate(() => window.game.scene.getScene('UIScene').controls.buttons[0].text.visible), false,
    'Controller connection hides touch buttons');
  const state = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));
  const button = async (index, duration = 70) => {
    await page.evaluate(i => { window.qaPad.buttons[i].pressed = true; }, index);
    await page.waitForTimeout(duration);
    await page.evaluate(i => { window.qaPad.buttons[i].pressed = false; }, index);
    await page.waitForTimeout(50);
  };
  const move = async (x, y) => {
    for (let i = 0; i < 100; i++) {
      const { player } = await state();
      const dx = x - player.x, dy = y - player.y;
      if (Math.hypot(dx, dy) < 5) return;
      const horizontal = Math.abs(dx) > Math.abs(dy);
      await button(horizontal ? dx > 0 ? 15 : 14 : dy > 0 ? 13 : 12,
        Math.max(20, Math.min(80, Math.max(Math.abs(dx), Math.abs(dy)) * 7)));
    }
    throw Error('Controller did not reach target');
  };
  await move(128, 122);
  await move(100, 122);
  const stopped = (await state()).player;
  await page.waitForTimeout(150);
  assert.deepEqual((await state()).player, stopped, 'Releasing D-pad stops movement');
  assert.equal(await page.evaluate(() => window.game.scene.getScene('UIScene').questBandVerbText.text), 'A');
  await button(0);
  assert((await state()).sceneProgress.juniorCompilerIntroduced, 'Controller A receives the assignment');
  await page.evaluate(() => { window.qaPad.connected = false; });
  await page.waitForTimeout(150);
  assert.equal(await page.evaluate(() => window.game.scene.getScene('UIScene').questBandVerbText.text), mobile ? 'A' : 'Z');
  assert.equal(await page.evaluate(() => window.game.scene.getScene('UIScene').gamepadToastText.text),
    mobile ? 'TOUCH CONTROLS READY' : 'KEYBOARD CONTROLS READY');
  if (mobile) {
    assert.equal(await page.evaluate(() => window.game.scene.getScene('UIScene').controls.buttons[0].text.visible), true,
      'Disconnect restores touch controls');
    const cdp = await page.context().newCDPSession(page);
    const bounds = await page.locator('canvas').first().boundingBox();
    const point = x => ({ x: bounds.x + x * bounds.width / 256, y: bounds.y + 178 * bounds.height / 240, id: 1 });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point(40)] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [point(66)] });
    await page.waitForTimeout(140);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  } else {
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(140);
    await page.keyboard.up('ArrowRight');
  }
  await page.waitForTimeout(70);
  assert((await state()).player.x > stopped.x + 5, 'Movement resumes after disconnect');
  const afterHandoff = (await state()).player;
  await page.waitForTimeout(100);
  assert.deepEqual((await state()).player, afterHandoff, 'Handoff movement stops on release');
  assert((await state()).sceneProgress.juniorCompilerIntroduced, 'Handoff preserves the assignment');
  assert.deepEqual(errors, []);
  const image = await page.evaluate(() => new Promise(resolve => window.game.renderer.snapshot(result => resolve(result.src))));
  await writeFile(`${out}/handoff.png`, Buffer.from(image.split(',')[1], 'base64'));
  await page.screenshot({ path: `${out}/viewport.png` });
  await writeFile(`${out}/result.json`, JSON.stringify({ controllerMovement: true, releaseStops: true,
    controllerAssignment: true, handoff: mobile ? 'touch' : 'keyboard', handoffStops: true, errors }, null, 2));
  console.log(`PASS controller movement, release, A interaction and ${mobile ? 'touch' : 'keyboard'} handoff`);
} finally {
  await browser.close();
}
