import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const out = process.env.FRUS_QA_OUT ?? '/private/tmp/frus-nara-briefing';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  const state = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));
  const hold = async (key, ms) => { await page.keyboard.down(key); await page.waitForTimeout(ms); await page.keyboard.up(key); };
  const shot = async name => {
    const image = await page.evaluate(() => new Promise(resolve => window.game.renderer.snapshot(i => resolve(i.src))));
    await writeFile(`${out}/${name}.png`, Buffer.from(image.split(',')[1], 'base64'));
  };
  await page.goto('http://127.0.0.1:5195/?scene=NaraStacksScene&text=full');
  await page.waitForFunction(() => window.render_game_to_text && JSON.parse(window.render_game_to_text()).scene === 'NaraStacksScene');
  await page.waitForTimeout(1500);
  const note = await page.evaluate(() => {
    const n = window.game.scene.getScene('NaraStacksScene').interactables.find(i => i.id === 'stacks-note');
    return { x: n.x, y: n.y };
  });
  for (const axis of ['x', 'y']) {
    const delta = note[axis] - (await state()).player[axis];
    if (Math.abs(delta) > 1) await hold(axis === 'x' ? delta < 0 ? 'ArrowLeft' : 'ArrowRight' : delta < 0 ? 'ArrowUp' : 'ArrowDown', Math.abs(delta) / 72 * 1000);
  }
  await page.waitForTimeout(60);
  const before = await state();
  await page.keyboard.press('Space', { delay: 40 });
  await page.waitForTimeout(9000);
  const after = await state();
  await shot('briefing');
  await writeFile(`${out}/briefing.json`, JSON.stringify({ note, before: before.player, after: after.player, reliability: after.reliability, errors }, null, 2));
  assert.equal(after.reliability, before.reliability, 'Standing at the briefing note must be outside stamp range');
  assert.deepEqual(after.player, before.player, 'Reading the briefing should not knock the hero away');
  assert.equal(after.nearestInteractable, 'Shelf Clue 2/2');
  await hold('ArrowUp', 640);
  await page.waitForTimeout(60);
  const entered = await state();
  await page.waitForTimeout(9000);
  const exposed = await state();
  await shot('aisle');
  assert.notDeepEqual(exposed.player, entered.player, 'Drone knockback pressure must remain active inside the archive aisle');
  assert.deepEqual(errors, []);
  await writeFile(`${out}/result.json`, JSON.stringify({ briefingPosition: after.player, aisleBefore: entered.player, aisleAfter: exposed.player, errors }, null, 2));
  console.log('Briefing is undisturbed for nine seconds; entering the aisle still draws stamp knockback');
} finally { await browser.close(); }
