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
if (process.argv.includes('--natural-entry')) {
  assert.equal(debugScenePlacement, false, 'Natural-entry QA requires a save earned by walking into NARA');
  assert.ok(saved.state.sceneProgress.visitedRoom_AS, 'The earned route must have visited Annotation Stacks');
}
const mobile = process.argv.includes('--mobile');
const out = process.env.FRUS_QA_OUT ?? '/private/tmp/frus-earned-secret';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE });
try {
  const context = await browser.newContext({ storageState,
    viewport: mobile ? { width: 375, height: 667 } : { width: 1024, height: 960 },
    hasTouch: mobile, isMobile: mobile, deviceScaleFactor: mobile ? 3 : 1 });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  const state = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));
  const touch = async (x, y, dx = 0, dy = 0, ms = 60) => {
    const b = await page.locator('canvas').first().boundingBox();
    const point = (px, py) => ({ x: b.x + px * b.width / 256, y: b.y + py * b.height / 240, id: 1 });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point(x, y)] });
    if (dx || dy) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [point(x + dx, y + dy)] });
    await page.waitForTimeout(ms);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  };
  const action = async () => {
    if (mobile) await touch(225, 205); else await page.keyboard.press('Space', { delay: 50 });
    await page.waitForTimeout(150);
  };
  const direction = async (key, ms) => {
    if (mobile) {
      const [dx, dy] = { ArrowLeft: [-26, 0], ArrowRight: [26, 0], ArrowUp: [0, -26], ArrowDown: [0, 26] }[key];
      await touch(40, 178, dx, dy, ms);
    } else {
      await page.keyboard.down(key); await page.waitForTimeout(ms); await page.keyboard.up(key);
    }
    await page.waitForTimeout(30);
  };
  const shot = async name => {
    const image = await page.evaluate(() => new Promise(resolve => window.game.renderer.snapshot(i => resolve(i.src))));
    await writeFile(`${out}/${name}.png`, Buffer.from(image.split(',')[1], 'base64'));
  };
  const moveTo = async (x, y) => {
    for (let i = 0; i < 80; i++) {
      const p = (await state()).player;
      const dx = x - p.x, dy = y - p.y;
      if (Math.abs(dx) <= 4 && Math.abs(dy) <= 4) return;
      const horizontal = Math.abs(dx) > 4;
      const key = horizontal ? dx < 0 ? 'ArrowLeft' : 'ArrowRight' : dy < 0 ? 'ArrowUp' : 'ArrowDown';
      const ms = Math.min(140, Math.max(25, Math.abs(horizontal ? dx : dy) / 72 * 1000));
      await direction(key, ms);
    }
    await shot('stuck');
    assert.fail(`Could not walk to ${x},${y}: ${JSON.stringify((await state()).player)}`);
  };
  await page.goto('http://127.0.0.1:5195/?text=full');
  await page.waitForFunction(() => window.render_game_to_text && JSON.parse(window.render_game_to_text()).scene === 'TapToStartScene');
  if (mobile) await touch(86, 154); else await page.keyboard.press('Enter');
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
  await page.waitForFunction(() => window.game.scene.getScene('UIScene').questBandCueText.text === 'EXIT: SOUTH DOOR');
  await shot('reward');
  const reward = await state();
  assert.equal(reward.sceneProgress.hiddenFirstEditionFound, 1);
  assert.equal(reward.documentPoints, initial.documentPoints + 25);
  await moveTo(128, 221);
  await direction('ArrowDown', 100);
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).scene === 'NaraStacksScene');
  await page.waitForTimeout(800);
  await shot('returned');
  await page.reload();
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).scene === 'TapToStartScene');
  if (mobile) await touch(86, 154); else await page.keyboard.press('Enter');
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).scene === 'NaraStacksScene');
  await page.waitForTimeout(800);
  const resumed = await state();
  assert.equal(resumed.sceneProgress.hiddenFirstEditionFound, 1);
  assert.equal(resumed.sceneProgress.hiddenReadingRoomDiscovered, 1);
  assert.equal(resumed.documentPoints, reward.documentPoints);
  assert.equal(resumed.inventory.filter(item => item === 'First Edition FRUS Volume').length, 1);
  await shot('continued');
  assert.deepEqual(errors, []);
  await writeFile(`${out}/earned-storage.json`, JSON.stringify(await context.storageState(), null, 2));
  await writeFile(`${out}/result.json`, JSON.stringify({ mobile, debugScenePlacement, toolEarned: true, beforePoints: initial.documentPoints,
    afterPoints: reward.documentPoints, discovered: true, collected: true, errors }, null, 2));
  console.log('Earned Folder opens the physical shelf; First Edition +25; return to NARA succeeds');
} finally { await browser.close(); }
