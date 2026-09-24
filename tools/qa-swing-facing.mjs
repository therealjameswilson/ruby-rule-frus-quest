import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const out = process.env.FRUS_QA_OUT ?? '/tmp/frus-swing-facing';
const mobile = process.argv.includes('--mobile');
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE });
try {
  const page = await browser.newPage(mobile ? { viewport: { width: 375, height: 667 }, hasTouch: true, isMobile: true, deviceScaleFactor: 3 } : {});
  const cdp = await page.context().newCDPSession(page);
  async function press(key) {
    if (!mobile) return page.keyboard.down(key);
    const b = await page.locator('canvas').first().boundingBox();
    const point = (x, y) => ({ x: b.x + x * b.width / 256, y: b.y + y * b.height / 240, id: 1 });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [key === 'x' ? point(174, 216) : point(48, 202)] });
    if (key !== 'x') await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [key === 'ArrowLeft' ? point(22, 202) : point(48, 228)] });
  }
  async function release(key) {
    if (!mobile) return page.keyboard.up(key);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  }
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(`${process.env.FRUS_QA_URL ?? 'http://127.0.0.1:5195/'}?scene=BlackVaultLairScene&text=full`);
  await page.waitForFunction(() => window.game?.scene?.getScene('BlackVaultLairScene')?.player);
  await page.waitForTimeout(1000);
  await press('ArrowDown');
  await page.waitForTimeout(40);
  await release('ArrowDown');
  await page.evaluate(() => {
    window.swingFacingSamples = [];
    const scene = window.game.scene.getScene('BlackVaultLairScene');
    scene.events.on('postupdate', () => {
      const p = scene.player;
      window.swingFacingSamples.push({ phase: p.combatReadout.weapon.phase, facing: p.facingDirection,
        x: p.position.x, y: p.position.y, hitbox: p.combatReadout.hitbox });
    });
  });
  await press('x');
  await page.waitForFunction(() => window.game.scene.getScene('BlackVaultLairScene').player.combatReadout.weapon.phase === 'windup');
  await release('x');
  await press('ArrowLeft');
  await page.waitForFunction(() => window.game.scene.getScene('BlackVaultLairScene').player.combatReadout.weapon.phase === 'active');
  const image = await page.evaluate(() => new Promise(resolve => window.game.renderer.snapshot(i => resolve(i.src))));
  await writeFile(`${out}/active.png`, Buffer.from(image.split(',')[1], 'base64'));
  await page.waitForTimeout(400);
  await release('ArrowLeft');
  const samples = await page.evaluate(() => window.swingFacingSamples);
  const active = samples.filter(s => s.phase === 'active');
  assert(active.length > 1, 'An active swing must be sampled');
  assert(active.every(s => s.facing === 'south'), 'The moving swing must keep its starting direction');
  assert(active.at(-1).x < active[0].x, 'Sideways footwork remains available');
  assert(active.every(s => s.hitbox && s.hitbox.y > s.y), 'The hitbox must stay south of the hero');
  assert(samples.some(s => s.phase === 'cooldown' && s.facing === 'west'), 'Recovery releases facing');
  assert.deepEqual(errors, []);
  await writeFile(`${out}/results.json`, JSON.stringify({ errors, samples }, null, 2));
  console.log('PASS: moving swing retains facing and hitbox; recovery permits turning');
} finally { await browser.close(); }
