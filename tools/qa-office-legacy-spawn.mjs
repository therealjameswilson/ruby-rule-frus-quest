import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const source = process.env.FRUS_QA_STORAGE;
assert(source, 'Provide an existing save via FRUS_QA_STORAGE');
const storage = JSON.parse(await readFile(source, 'utf8'));
const entry = storage.origins.flatMap(origin => origin.localStorage).find(item => item.name === 'rubyRuleFrusQuestSave');
assert(entry, 'Source fixture must contain a save');
const save = JSON.parse(entry.value);
// Explicit compatibility fixture, not an earned playthrough: old builds let
// players save while standing inside JR. Preserve all unrelated run progress.
save.state.currentScene = 'OfficeScene';
save.state.player = { x: 70, y: 122 };
entry.value = JSON.stringify(save);
const out = process.env.FRUS_QA_OUT ?? '/tmp/frus-office-legacy-spawn';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_EXECUTABLE ? { executablePath: process.env.CHROMIUM_EXECUTABLE } : {}) });
try {
  const context = await browser.newContext({ storageState: storage, viewport: { width: 1024, height: 960 } });
  const page = await context.newPage(), errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  await page.goto(process.env.FRUS_QA_URL ?? 'http://127.0.0.1:5195/?text=full');
  await page.waitForFunction(() => window.render_game_to_text && JSON.parse(window.render_game_to_text()).scene === 'TapToStartScene');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).scene === 'OfficeScene');
  await page.waitForTimeout(800);
  const state = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));
  const resumed = await state();
  assert.deepEqual(resumed.player, { x: 100, y: 122 });
  assert.equal(resumed.documentPoints, save.state.documentPoints);
  assert.equal(resumed.reliability, save.state.reliability);
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(180);
  await page.keyboard.up('ArrowRight');
  const moved = await state();
  assert(moved.player.x > resumed.player.x + 5, 'Recovered save must remain walkable');
  assert.deepEqual(errors, []);
  const image = await page.evaluate(() => new Promise(resolve => window.game.renderer.snapshot(img => resolve(img.src))));
  await writeFile(`${out}/recovered-native.png`, Buffer.from(image.split(',')[1], 'base64'));
  await writeFile(`${out}/result.json`, JSON.stringify({ fixture: 'legacy overlapping JR spawn', resumed, moved, errors }, null, 2));
  console.log('PASS legacy Office save recovers beside JR, preserves points/reliability and can move');
} finally {
  await browser.close();
}
