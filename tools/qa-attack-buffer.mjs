import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const out = process.env.FRUS_QA_OUT ?? '/tmp/frus-attack-buffer';
const touch = process.argv.includes('--touch');
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE });
const results = [];
try {
  for (const sceneKey of ['BlackVaultLairScene', 'GameplayMapScene']) {
    const page = await browser.newPage(touch ? { viewport: { width: 375, height: 667 }, hasTouch: true, isMobile: true, deviceScaleFactor: 3 } : {}), errors = [];
    const cdp = await page.context().newCDPSession(page);
    page.on('pageerror', e => errors.push(String(e)));
    await page.goto(`${process.env.FRUS_QA_URL ?? 'http://127.0.0.1:5195/'}?scene=${sceneKey}&text=full`);
    await page.waitForFunction(key => window.game?.scene?.getScene(key)?.player, sceneKey);
    await page.waitForTimeout(1100);
    const weapon = () => page.evaluate(key => window.game.scene.getScene(key).player.combatReadout.weapon, sceneKey);
    async function press(key) {
      // This probe uses touch for tool input; keyboard M isolates menu cancellation.
      if (!touch || key !== 'x') return page.keyboard.press(key, { delay: 20 });
      const b = await page.locator('canvas').first().boundingBox();
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: b.x + 174 * b.width / 256, y: b.y + 216 * b.height / 240, id: 1 }] });
      await page.waitForTimeout(20);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    }
    async function ready() {
      await page.waitForFunction(key => window.game.scene.getScene(key).player.combatReadout.weapon.canSwing, sceneKey);
    }
    async function lateWindow() {
      await page.waitForFunction(key => {
        const w = window.game.scene.getScene(key).player.combatReadout.weapon;
        return w.phase === 'cooldown' && w.cooldownMsRemaining <= 90;
      }, sceneKey, { polling: 'raf' });
      const w = await weapon();
      assert(w.cooldownMsRemaining > 25, 'Tap must actually precede recovery');
    }
    await ready();
    const initial = (await weapon()).swingId;
    await press('x'); await lateWindow();
    await press('x');
    await page.waitForFunction(({ key, id }) => window.game.scene.getScene(key).player.actionId === id + 2, { key: sceneKey, id: initial });
    const image = await page.evaluate(() => new Promise(resolve => window.game.renderer.snapshot(i => resolve(i.src))));
    await writeFile(`${out}/${sceneKey}.png`, Buffer.from(image.split(',')[1], 'base64'));
    await ready(); await page.waitForTimeout(150);
    assert.equal((await weapon()).swingId, initial + 2, 'One tap queues exactly one swing');
    await press('x'); await page.waitForTimeout(110); await press('x');
    await ready(); await page.waitForTimeout(160);
    assert.equal((await weapon()).swingId, initial + 3, 'Too-early taps expire');
    await press('x'); await page.waitForTimeout(110); await press('x');
    await page.waitForFunction(key => window.game.scene.getScene(key).attackBuffer.bufferedUntil !== null, sceneKey, { polling: 'raf', timeout: 1000 });
    assert.notEqual(await page.evaluate(key => window.game.scene.getScene(key).attackBuffer.bufferedUntil, sceneKey), null, 'Cancellation starts with a genuinely queued tap');
    assert.equal((await weapon()).swingId, initial + 4, 'Queued tap has not fired before pause');
    await press('m');
    assert.equal(await page.evaluate(() => JSON.parse(window.render_game_to_text()).mode), 'pause');
    assert.equal(await page.evaluate(key => window.game.scene.getScene(key).attackBuffer.bufferedUntil, sceneKey), null, 'Menu clears the buffer immediately');
    await page.waitForTimeout(150); await press('m'); await ready(); await page.waitForTimeout(160);
    assert.equal((await weapon()).swingId, initial + 4, 'Pause clears a pending swing');
    assert.deepEqual(errors, []);
    results.push({ sceneKey, toolInput: touch ? 'touch' : 'keyboard', pauseInput: 'keyboard', lateTapQueuedOnce: true, earlyTapExpired: true, pauseCleared: true, errors });
    await page.close();
  }
} finally {
  await writeFile(`${out}/results.json`, JSON.stringify(results, null, 2));
  await browser.close();
}
console.log(JSON.stringify(results, null, 2));
