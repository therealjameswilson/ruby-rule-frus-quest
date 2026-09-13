// Read state only; approach the gate through actual keyboard movement.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const out = process.env.FRUS_QA_OUT ?? '/private/tmp/frus-locked-route';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE });
try {
  for (const [direction, takeNote] of [['east', false], ['east', true], ['north', false], ['north', true]]) {
    const context = await browser.newContext({ viewport: { width: 1024, height: 900 } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    const state = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));
    const hold = async (key, ms) => {
      await page.keyboard.down(key); await page.waitForTimeout(ms); await page.keyboard.up(key);
    };
    await page.goto('http://127.0.0.1:5195/?scene=ArchiveScene&text=full');
    await page.waitForFunction(() => window.render_game_to_text && JSON.parse(window.render_game_to_text()).scene === 'ArchiveScene');
    await page.waitForTimeout(1600);
    if (takeNote) {
      await page.keyboard.press('Space');
      await page.waitForTimeout(300);
      assert.equal((await state()).heldItem, 'Source Note 47');
    }
    if (direction === 'east') {
      await hold('ArrowRight', 1200);
      await hold('ArrowUp', 880);
      await hold('ArrowRight', 700);
    } else {
      await hold('ArrowLeft', 700);
      await hold('ArrowUp', 1800);
      await hold('ArrowRight', 700);
      await hold('ArrowUp', 500);
      await page.keyboard.press('Space');
      await page.waitForTimeout(100);
    }
    const result = await state();
    const text = await page.evaluate(() => window.game.scene.getScene('ArchiveScene').children.list
      .filter(o => o.type === 'Container' && o.visible).flatMap(o => o.list ?? [])
      .filter(o => typeof o.text === 'string').map(o => o.text));
    const name = `${direction}-${takeNote ? 'carried' : 'uncollected'}`;
    const native = await page.evaluate(() => new Promise(resolve => window.game.renderer.snapshot(i => resolve(i.src))));
    await writeFile(`${out}/${name}.png`, Buffer.from(native.split(',')[1], 'base64'));
    await writeFile(`${out}/${name}.json`, JSON.stringify({ objective: result.objective, position: result.player, text, errors }, null, 2));
    const expected = takeNote ? 'NOTE TO TABLE' : 'PICK UP SOURCE NOTE';
    assert.equal(result.scene, 'ArchiveScene');
    assert.equal(result.objective, expected);
    assert.ok(text.includes(expected), `Missing actionable gate toast: ${JSON.stringify(text)}`);
    assert.deepEqual(errors, []);
    console.log(`${name}: locked gate gives ${expected}`);
    await context.close();
  }
} finally { await browser.close(); }
