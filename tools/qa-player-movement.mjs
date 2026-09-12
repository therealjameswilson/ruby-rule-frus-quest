import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const out = process.env.FRUS_QA_OUT ?? '/tmp/frus-player-movement';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE });
const results = [];
try {
  for (const mobile of [false, true]) {
    const context = await browser.newContext({ viewport: mobile ? { width: 375, height: 667 } : { width: 1024, height: 960 },
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
          blocked: scene.solids.some(r => p.logicalX + 8 >= r.x && p.logicalX - 8 <= r.right && p.logicalY + 5 >= r.y && p.logicalY - 3 <= r.bottom) });
      });
    });
    const start = (await state()).player;
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
    await direction(0, -1, 620);
    await direction(-1, 0, 700);
    const wall = (await state()).player;
    await direction(-1, 0, 350);
    assert.deepEqual((await state()).player, wall, 'A solid desk must not pull the hero sideways');
    await direction(-1, -1, 250);
    const samples = await page.evaluate(() => window.movementSamples);
    assert(samples.every(s => Number.isInteger(s.renderX) && Number.isInteger(s.renderY)), 'Render positions stay pixel aligned');
    assert(samples.every(s => !s.blocked), 'Feet must remain outside furniture');
    assert(samples.some(s => s.vx === 72) && samples.some(s => s.vx === -72));
    for (const direction of ['right', 'left']) {
      const walking = samples.filter(s => s.animation === `walk_${direction}`);
      assert(walking.every(s => s.frameRate === 8), 'Walking uses the eight-fps cadence');
      assert(new Set(walking.map(s => s.frame)).size === 2, 'Both foot poses must render while walking');
    }
    const label = mobile ? 'touch' : 'keyboard';
    const native = await page.evaluate(() => new Promise(resolve => window.game.renderer.snapshot(i => resolve(i.src))));
    await writeFile(`${out}/${label}-native.png`, Buffer.from(native.split(',')[1], 'base64'));
    await page.screenshot({ path: `${out}/${label}.png` });
    await writeFile(`${out}/${label}-samples.json`, JSON.stringify(samples));
    assert.deepEqual(errors, []);
    results.push({ input: label, start, right, left, wall, end: (await state()).player, frames: samples.length, errors });
    await context.close();
  }
} finally {
  await writeFile(`${out}/results.json`, JSON.stringify(results, null, 2));
  await browser.close();
}
console.log(JSON.stringify(results, null, 2));
