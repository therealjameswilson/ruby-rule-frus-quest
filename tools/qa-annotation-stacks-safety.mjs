import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const out = process.env.FRUS_QA_OUT ?? '/tmp/frus-annotation-stacks-safety';
const base = process.env.FRUS_QA_URL ?? 'http://127.0.0.1:5195/';
assert(process.env.FRUS_QA_STORAGE, 'Use partial-stacks-storage.json earned by qa-archive-wall.mjs');
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true,
  ...(process.env.CHROMIUM_EXECUTABLE ? { executablePath: process.env.CHROMIUM_EXECUTABLE } : {}) });
const cases = [['partial-packet', process.env.FRUS_QA_STORAGE, false], ['missing-tiles', process.env.FRUS_QA_STORAGE, true]];
if (process.env.FRUS_QA_LEGACY_STORAGE) cases.push(['old-completed', process.env.FRUS_QA_LEGACY_STORAGE, false]);
const results = [];
try {
  for (const [name, storage, fallback] of cases) {
    const context = await browser.newContext({ storageState: JSON.parse(await readFile(storage, 'utf8')), viewport: { width: 1024, height: 960 } });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(String(error)));
    page.on('console', message => { if (message.type() === 'error' && !(fallback && message.text().includes('net::ERR_FAILED'))) errors.push(message.text()); });
    if (fallback) await page.route('**/tileset_interiors_16x16_native.png', route => route.abort());
    const state = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));
    async function press(key = 'Space') { await page.keyboard.press(key, { delay: 50 }); await page.waitForTimeout(180); }
    async function hold(key, ms) { await page.keyboard.down(key); await page.waitForTimeout(ms); await page.keyboard.up(key); }
    async function move(x, y, destination) {
      for (let i = 0; i < 150; i++) {
        const s = await state();
        if (destination && (s.scene === destination || s.roomTraversal?.currentRoomId === destination)) { await page.waitForTimeout(800); return; }
        const dx = x - s.player.x, dy = y - s.player.y;
        if (!destination && Math.hypot(dx, dy) < 5) return;
        await hold(Math.abs(dx) > Math.abs(dy) ? dx > 0 ? 'ArrowRight' : 'ArrowLeft' : dy > 0 ? 'ArrowDown' : 'ArrowUp', 75);
        await page.waitForTimeout(25);
      }
      throw Error(`${name} blocked toward ${x},${y}: ${JSON.stringify((await state()).player)}`);
    }
    async function shot(label) {
      const image = await page.evaluate(() => new Promise(resolve => window.game.renderer.snapshot(image => resolve(image.src))));
      await writeFile(`${out}/${name}-${label}-native.png`, Buffer.from(image.split(',')[1], 'base64'));
      await page.screenshot({ path: `${out}/${name}-${label}.png` });
    }
    try {
      await page.goto(`${base}?text=full`);
      await page.waitForFunction(() => window.render_game_to_text && JSON.parse(window.render_game_to_text()).scene === 'TapToStartScene');
      await press('Enter'); await page.waitForTimeout(1600);
      const before = await state();
      if (name === 'old-completed') {
        assert.equal(before.scene, 'NetworkScene');
        await move(8, 124, 'ArchiveScene');
        await move(216, 76); await move(128, 72); await press(); await page.waitForTimeout(900);
        assert.equal((await state()).roomTraversal.currentRoomId, 'AS');
        assert.equal((await state()).sceneProgress.annotationDraftingComplete, 1);
        await move(128, 40, 'NaraStacksScene'); await shot('nara-route');
        await move(128, 207); await press(); await page.waitForTimeout(1200);
        assert.equal((await state()).roomTraversal.currentRoomId, 'AS');
        assert(Math.abs((await state()).player.y - 64) < 3);
        await shot('nara-return');
        await move(128, 220, 'A1');
      } else {
        assert.equal(before.roomTraversal.currentRoomId, 'AS');
        assert.equal(before.sceneProgress.annotationGatheredMask, 4);
        if (fallback) assert.equal(await page.evaluate(() => window.game.textures.exists('pack-tiles-interiors-native')), false);
        await move(208, 190); await move(128, 190); await move(128, 150);
        await hold('ArrowLeft', 800); assert((await state()).player.x >= 100, 'Shelf must be solid');
        await move(128, 150); await move(128, 220, 'A1');
        assert.equal((await state()).heldItem, before.heldItem);
        await move(80, 72); await move(80, 145); await move(128, 145); await press();
        assert(!(await state()).sceneProgress.annotationDraftingComplete);
        assert.equal((await state()).mode, 'explore');
        await move(80, 145); await move(80, 72); await move(128, 72); await press(); await page.waitForTimeout(900);
        assert.equal((await state()).roomTraversal.currentRoomId, 'AS');
        await page.waitForTimeout(2200);
        await shot('returned');
      }
      const after = await state();
      assert.equal(after.documentPoints, before.documentPoints);
      assert.deepEqual(after.inventory, before.inventory);
      assert.deepEqual(after.documentCandidates, before.documentCandidates);
      assert.deepEqual(errors, []);
      results.push({ name, pass: true, scene: after.scene, room: after.roomTraversal.currentRoomId, points: after.documentPoints, errors });
      console.log(results.at(-1));
    } catch (error) {
      await shot('failure'); throw error;
    } finally { await context.close(); }
  }
} finally {
  await writeFile(`${out}/results.json`, JSON.stringify(results, null, 2));
  await browser.close();
}
