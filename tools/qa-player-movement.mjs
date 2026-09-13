import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const out = process.env.FRUS_QA_OUT ?? '/tmp/frus-player-movement';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE });
const results = [];
const landscape = process.argv.includes('--landscape');
try {
  for (const mobile of [false, true]) {
    const viewport = mobile ? landscape ? { width: 667, height: 375 } : { width: 375, height: 667 } : { width: 1024, height: 960 };
    const context = await browser.newContext({ viewport,
      hasTouch: mobile, isMobile: mobile, deviceScaleFactor: mobile ? 3 : 1 });
    const page = await context.newPage(), cdp = await context.newCDPSession(page), errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(`${process.env.FRUS_QA_URL ?? 'http://127.0.0.1:5195/'}?scene=OfficeScene&text=full`);
    await page.waitForFunction(() => window.render_game_to_text && JSON.parse(window.render_game_to_text()).scene === 'OfficeScene');
    await page.waitForTimeout(1500);
    const state = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));
    async function direction(x, y, ms) {
      if (mobile) {
        const b = await page.locator('canvas').first().boundingBox();
        const p = (dx, dy) => ({ x: b.x + (40 + dx) * b.width / 256, y: b.y + (178 + dy) * b.height / 240, id: 1 });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [p(0, 0)] });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [p(x * 26, y * 26)] });
        await page.waitForTimeout(ms);
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      } else {
        const keys = [...(x ? [x < 0 ? 'ArrowLeft' : 'ArrowRight'] : []), ...(y ? [y < 0 ? 'ArrowUp' : 'ArrowDown'] : [])];
        for (const key of keys) await page.keyboard.down(key);
        await page.waitForTimeout(ms);
        for (const key of keys) await page.keyboard.up(key);
      }
      await page.waitForTimeout(40);
    }
    await page.evaluate(() => {
      window.movementSamples = [];
      const scene = window.game.scene.getScene('OfficeScene');
      scene.events.on('postupdate', () => {
        const p = scene.player;
        window.movementSamples.push({ x: p.logicalX, y: p.logicalY, vx: p.velocityX, vy: p.velocityY,
          renderX: p.sprite.x, renderY: p.sprite.y, animation: p.animationState,
          frame: p.sprite.frame.name, frameRate: p.sprite.anims.currentAnim?.frameRate,
          blocked: scene.solids.some(r => p.logicalX + 6 > r.x && p.logicalX - 6 < r.right && p.logicalY + 5 > r.y && p.logicalY - 3 < r.bottom) });
      });
    });
    const start = (await state()).player;
    if (process.argv.includes('--interaction-hint')) {
      async function action() {
        if (mobile) {
          const box = await page.locator('canvas').first().boundingBox();
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{
            x: box.x + 225 * box.width / 256, y: box.y + 205 * box.height / 240, id: 2
          }] });
          await page.waitForTimeout(45);
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        } else await page.keyboard.press('Space', { delay: 45 });
        await page.waitForTimeout(80);
      }
      await action();
      assert(await page.evaluate(() => window.game.scene.getScene('OfficeScene').toast.visible));
      await direction(0, -1, 500);
      const feedback = await page.evaluate(() => {
        const scene = window.game.scene.getScene('OfficeScene');
        return { toast: scene.toast.visible, prompt: scene.prompt.visible,
          nearest: JSON.parse(window.render_game_to_text()).nearestInteractable };
      });
      await page.screenshot({ path: `${out}/${mobile ? 'touch' : 'keyboard'}-interaction-hint.png` });
      assert(feedback.nearest, 'The short approach must reach the compiler');
      assert.equal(feedback.toast, false, 'Stale proximity feedback must yield to the reachable action');
      assert.equal(feedback.prompt, true, 'Show the action as soon as it is reachable');
      await action();
      assert.equal((await state()).sceneProgress.juniorCompilerIntroduced, 1, 'The revealed Talk action must work');
      assert(await page.evaluate(() => window.game.scene.getScene('OfficeScene').toast.visible),
        'New assignment feedback must retain its reading time');
      await direction(0, 1, 500);
    }
    await direction(1, 0, 350);
    const right = (await state()).player;
    assert(right.x > start.x + 15, 'Walking must respond on either input source');
    await direction(-1, 0, 350);
    const left = (await state()).player;
    assert(left.x < right.x - 15);
    await page.waitForTimeout(250);
    assert.deepEqual((await state()).player, left, 'Release must not coast');
    // Navigate the center aisle, press into the desk, then slide along its edge.
    for (let i = 0; i < 30; i++) {
      const p = (await state()).player;
      if (Math.abs(p.x - 128) <= 2) break;
      await direction(Math.sign(128 - p.x), 0, 30);
    }
    for (let i = 0; i < 30; i++) {
      const p = (await state()).player;
      if (Math.abs(p.y - 154) <= 3) break;
      await direction(0, Math.sign(154 - p.y), 30);
    }
    await direction(-1, 0, 700);
    const wall = (await state()).player;
    await direction(-1, 0, 350);
    assert.deepEqual((await state()).player, wall, 'A solid desk must not pull the hero sideways');
    await direction(-1, -1, 250);
    if (mobile) {
      const box = await page.locator('canvas').first().boundingBox();
      const point = (dx, dy) => ({ x: box.x + (40 + dx) * box.width / 256,
        y: box.y + (178 + dy) * box.height / 240, id: 3 });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point(0, 0)] });
      for (const [dx, dy, expected] of [[20, 0, 'right'], [20, 21, 'right'], [21, 20, 'right'],
        [20, 26, 'down'], [21, 20, 'down'], [26, 20, 'right'], [-20, 0, 'left'], [0, 0, null]]) {
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [point(dx, dy)] });
        await page.waitForTimeout(30);
        assert.equal(await page.evaluate(() => window.rubyRuleTouchControls.dpadDirection), expected,
          `Touch direction at ${dx},${dy} must resist boundary jitter without delaying deliberate turns`);
      }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      const stopped = (await state()).player;
      await page.waitForTimeout(100);
      assert.deepEqual((await state()).player, stopped, 'Returning thumb to center stops immediately');
      if (process.argv.includes('--rotate')) {
        const box = await page.locator('canvas').first().boundingBox();
        const point = x => ({ x: box.x + x * box.width / 256, y: box.y + 178 * box.height / 240, id: 4 });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point(40)] });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [point(66)] });
        await page.waitForTimeout(80);
        await page.setViewportSize(landscape ? { width: 375, height: 667 } : { width: 667, height: 375 });
        await page.waitForTimeout(250);
        assert.equal(await page.evaluate(() => window.rubyRuleTouchControls.dpadPointerId), null, 'Rotation must release the old thumb capture');
        const rotated = (await state()).player;
        await page.waitForTimeout(180);
        assert.deepEqual((await state()).player, rotated, 'Rotation must not leave stale movement');
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await direction(-1, 0, 120);
        assert((await state()).player.x < rotated.x, 'A fresh touch must work after rotation');
      }
    }
    const samples = await page.evaluate(() => window.movementSamples);
    assert(samples.every(s => Number.isInteger(s.renderX) && Number.isInteger(s.renderY)), 'Render positions stay pixel aligned');
    assert(samples.every(s => !s.blocked), 'Feet must remain outside furniture');
    assert(samples.some(s => s.vx === 90) && samples.some(s => s.vx === -90), 'Brisk walking speed in both directions');
    for (const direction of ['right', 'left']) {
      const walking = samples.filter(s => s.animation === `walk_${direction}`);
      assert(new Set(walking.map(s => s.frame)).size === 2, 'Both foot poses must render while walking');
    }
    const label = mobile ? 'touch' : 'keyboard';
    const native = await page.evaluate(() => new Promise(resolve => window.game.renderer.snapshot(i => resolve(i.src))));
    await writeFile(`${out}/${label}-native.png`, Buffer.from(native.split(',')[1], 'base64'));
    await page.screenshot({ path: `${out}/${label}.png` });
    await writeFile(`${out}/${label}-samples.json`, JSON.stringify(samples));
    assert.deepEqual(errors, []);
    results.push({ input: label, viewport, finalViewport: page.viewportSize(), rotationChecked: mobile && process.argv.includes('--rotate'), start, right, left, wall, end: (await state()).player, frames: samples.length, errors });
    await context.close();
  }
} finally {
  await writeFile(`${out}/results.json`, JSON.stringify(results, null, 2));
  await browser.close();
}
console.log(JSON.stringify(results, null, 2));
