// Earned inventory; native NARA saves need no debug placement. All rewards use input.
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
assert(process.env.FRUS_QA_STORAGE, 'Provide an earned storage-state file containing Review Folder');
const storageState = JSON.parse(await readFile(process.env.FRUS_QA_STORAGE, 'utf8'));
const saved = JSON.parse(storageState.origins.flatMap(o => o.localStorage).find(e => e.name === 'rubyRuleFrusQuestSave').value);
assert.ok(saved.state.inventory.includes('Review Folder'));
assert.ok(!saved.state.sceneProgress.hiddenReadingRoomDiscovered, 'Use a save before discovery');
const debugScenePlacement = saved.state.currentScene !== 'NaraStacksScene';
const out = process.env.FRUS_QA_OUT ?? '/private/tmp/frus-earned-secret';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE });
try {
  const context = await browser.newContext({ storageState });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  const state = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));
  const action = async () => { await page.keyboard.press('Space', { delay: 50 }); await page.waitForTimeout(150); };
  const shot = async name => {
    const image = await page.evaluate(() => new Promise(resolve => window.game.renderer.snapshot(i => resolve(i.src))));
    await writeFile(`${out}/${name}.png`, Buffer.from(image.split(',')[1], 'base64'));
  };
  const moveTo = async (x, y) => {
    for (let i = 0; i < 80; i++) {
      const p = (await state()).player;
      const dx = x - p.x, dy = y - p.y;
      if (Math.abs(dx) <= 2 && Math.abs(dy) <= 2) return;
      const horizontal = Math.abs(dx) > 2;
      const key = horizontal ? dx < 0 ? 'ArrowLeft' : 'ArrowRight' : dy < 0 ? 'ArrowUp' : 'ArrowDown';
      const ms = Math.min(140, Math.max(25, Math.abs(horizontal ? dx : dy) / 72 * 1000));
      await page.keyboard.down(key); await page.waitForTimeout(ms); await page.keyboard.up(key); await page.waitForTimeout(30);
    }
    await shot('stuck');
    assert.fail(`Could not walk to ${x},${y}: ${JSON.stringify((await state()).player)}`);
  };
  await page.goto('http://127.0.0.1:5195/?text=full');
  await page.waitForFunction(() => window.render_game_to_text && JSON.parse(window.render_game_to_text()).scene === 'TapToStartScene');
  await page.keyboard.press('Enter');
  await page.waitForFunction(scene => window.game.scene.isActive(scene), saved.state.currentScene);
  await page.waitForTimeout(500);
  // Continue loads the real save first; only location is changed for this fixture.
  if (debugScenePlacement) {
    await page.evaluate(scene => window.game.scene.getScene(scene).scene.start('NaraStacksScene'), saved.state.currentScene);
  }
  await page.waitForTimeout(1800);
  const initial = await state();
  assert.ok(initial.inventory.includes('Review Folder'));
  assert.ok(!initial.sceneProgress.hiddenReadingRoomDiscovered);
  await action(); await page.waitForTimeout(2100); await action();
  await shot('clue');
  await moveTo(140, 154);
  await moveTo(166, 154);
  await moveTo(166, 92);
  await moveTo(204, 92);
  await action();
  await page.waitForTimeout(700);
  await shot('passage');
  assert.equal((await state()).sceneProgress.hiddenReadingRoomDiscovered, 1);
  assert.equal((await state()).playerCombat.weapon.tool, 'review_folder');
  await action();
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).scene === 'HiddenReadingRoomScene');
  await page.waitForTimeout(1600);
  await moveTo(128, 148);
  await action(); await page.waitForTimeout(500);
  await shot('reward');
  const reward = await state();
  assert.equal(reward.sceneProgress.hiddenFirstEditionFound, 1);
  assert.equal(reward.documentPoints, initial.documentPoints + 25);
  await moveTo(128, 221);
  await page.keyboard.press('ArrowDown', { delay: 100 });
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).scene === 'NaraStacksScene');
  await page.waitForTimeout(800);
  await shot('returned');
  assert.deepEqual(errors, []);
  await writeFile(`${out}/earned-storage.json`, JSON.stringify(await context.storageState(), null, 2));
  await writeFile(`${out}/result.json`, JSON.stringify({ debugScenePlacement, toolEarned: true, beforePoints: initial.documentPoints,
    afterPoints: reward.documentPoints, discovered: true, collected: true, errors }, null, 2));
  console.log('Earned Folder opens the physical shelf; First Edition +25; return to NARA succeeds');
} finally { await browser.close(); }
