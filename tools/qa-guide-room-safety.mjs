import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const base = process.env.FRUS_QA_URL ?? 'http://127.0.0.1:5195/';
const out = process.env.FRUS_QA_OUT ?? '/tmp/frus-guide-room-safety';
assert(process.env.FRUS_STORAGE, 'Provide earned-guide-storage.json from qa-guide-counter.mjs');
const earned = JSON.parse(await readFile(process.env.FRUS_STORAGE, 'utf8'));
const saved = JSON.parse(earned.origins.flatMap(origin => origin.localStorage).find(item => item.name === 'rubyRuleFrusQuestSave').value);
assert.equal(saved.state.currentScene, 'GuideScene');
assert(saved.state.volumeFragments.includes('Front Matter Fragment'));
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_EXECUTABLE ? { executablePath: process.env.CHROMIUM_EXECUTABLE } : {}) });
const results = [], errors = [];
try {
  for (const fixture of ['old-outside-position', 'missing-native-tiles']) {
    const storageState = structuredClone(earned);
    if (fixture === 'old-outside-position') {
      const item = storageState.origins.flatMap(origin => origin.localStorage).find(item => item.name === 'rubyRuleFrusQuestSave');
      const legacy = JSON.parse(item.value);
      legacy.state.player = { x: 242, y: 220 };
      item.value = JSON.stringify(legacy);
    }
    const context = await browser.newContext({ viewport: { width: 1024, height: 960 }, storageState });
    const page = await context.newPage();
    const state = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));
    page.on('pageerror', error => errors.push(String(error)));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.goto(new URL('?text=full', base).href);
    await page.waitForFunction(() => window.render_game_to_text && JSON.parse(window.render_game_to_text()).scene === 'TapToStartScene');
    if (fixture === 'missing-native-tiles') {
      // Deliberate asset fault in an isolated earned-save context, before the room creates.
      await page.evaluate(() => window.game.textures.remove('pack-tiles-archive-dungeon-native'));
    }
    await page.keyboard.press('Enter', { delay: 45 });
    await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).scene === 'GuideScene');
    await page.waitForTimeout(1000);
    const resumed = await state();
    if (fixture === 'old-outside-position') assert.deepEqual(resumed.player, { x: 216, y: 180 });
    assert.equal(resumed.guideCounter, null);
    assert.equal(resumed.documentPoints, saved.state.documentPoints);
    assert.equal(resumed.reliability, saved.state.reliability);
    assert.deepEqual(resumed.inventory, saved.state.inventory);
    assert.deepEqual(resumed.volumeFragments, saved.state.volumeFragments);
    await page.screenshot({ path: `${out}/${fixture}.png` });
    for (const key of ['ArrowRight', 'ArrowDown']) {
      await page.keyboard.down(key); await page.waitForTimeout(2500); await page.keyboard.up(key);
    }
    await page.waitForTimeout(50);
    assert.deepEqual((await state()).player, { x: 216, y: 180 });
    // Return to the same south gate through real movement, without setting coordinates.
    for (let n = 0; n < 25 && (await state()).player.x > 134; n++) {
      await page.keyboard.down('ArrowLeft'); await page.waitForTimeout(80); await page.keyboard.up('ArrowLeft');
      await page.waitForTimeout(20);
    }
    assert.equal((await state()).nearestInteractable, 'Verification Gate');
    await page.keyboard.press('Space', { delay: 45 });
    await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).scene === 'ArchiveScene');
    assert.equal((await state()).documentPoints, saved.state.documentPoints);
    results.push({ fixture, resumedAt: resumed.player, exit: 'ArchiveScene', documentPoints: resumed.documentPoints });
    await context.close();
    console.log('PASS', fixture);
  }
  assert.deepEqual(errors, []);
} finally {
  await writeFile(`${out}/results.json`, JSON.stringify({ results, errors }, null, 2));
  await browser.close();
}
