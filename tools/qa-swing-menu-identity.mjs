import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const out = process.env.FRUS_QA_OUT ?? '/private/tmp/frus-swing-menu-identity';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE });
const page = await browser.newPage({ viewport: { width: 1024, height: 960 } });
const errors = [];
page.on('pageerror', error => errors.push(String(error)));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
const state = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));
async function shot(name) {
  const image = await page.evaluate(() => new Promise(resolve => window.game.renderer.snapshot(image => resolve(image.src))));
  await writeFile(`${out}/${name}.png`, Buffer.from(image.split(',')[1], 'base64'));
  await writeFile(`${out}/${name}.json`, JSON.stringify(await state(), null, 2));
}
try {
  for (const scene of ['GameplayMapScene', 'NaraStacksScene']) {
    await page.goto(`http://127.0.0.1:5195/?scene=${scene}&map=nara_stacks&text=full`);
    await page.waitForFunction(scene => window.render_game_to_text && JSON.parse(window.render_game_to_text()).scene === scene, scene);
    await page.waitForTimeout(1200);
    const empty = await state();
    assert(!empty.inventory.includes('Citation Stamp'));
    await page.keyboard.press('x', { delay: 30 });
    await page.waitForTimeout(250);
    assert.equal((await state()).playerCombat.weapon.swingId, empty.playerCombat.weapon.swingId,
      `${scene}: empty inventory must not normalize into a free Stamp swing`);
    await shot(`${scene}-unowned-tool-blocked`);
  }
  await page.goto('http://127.0.0.1:5195/?scene=GameplayMapScene&map=nara_stacks&give=combat-tools&equip=review_folder&text=full');
  await page.waitForFunction(() => window.render_game_to_text && JSON.parse(window.render_game_to_text()).scene === 'GameplayMapScene');
  await page.waitForTimeout(1200);
  await page.evaluate(() => {
    const scene = window.game.scene.getScene('GameplayMapScene');
    window.swingToolTrace = [];
    for (const enemy of scene.danneEnemies) {
      const original = enemy.tryPlayerToolHit.bind(enemy);
      // Observe the real hit-resolution arguments without altering results.
      enemy.tryPlayerToolHit = (...args) => {
        if (args[0]) window.swingToolTrace.push({ tool: args[1], swingId: args[3],
          visibleTool: scene.player.combatReadout.weapon.tool });
        return original(...args);
      };
    }
  });
  await page.keyboard.press('x', { delay: 20 });
  await page.keyboard.press('m', { delay: 20 });
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).mode === 'pause');
  const paused = await state();
  assert(['windup', 'active'].includes(paused.playerCombat.weapon.phase), 'Open the menu during the committed swing');
  assert.equal(paused.playerCombat.weapon.tool, 'review_folder');
  const swingId = paused.playerCombat.weapon.swingId;
  const canvas = await page.locator('canvas').first().boundingBox();
  // Select and equip the second tool slot through the actual pause menu.
  for (let i = 0; i < 2; i++) {
    await page.mouse.click(canvas.x + canvas.width * 100 / 256, canvas.y + canvas.height * 80 / 240);
    await page.waitForTimeout(120);
  }
  assert.equal((await state()).pauseMenu.selectedTool, 'red_pencil');
  assert.equal((await state()).playerCombat.weapon.tool, 'review_folder');
  await shot('pencil-selected-folder-held');
  await page.keyboard.press('Escape', { delay: 30 });
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).mode === 'explore');
  await page.waitForTimeout(700);
  const resumed = await page.evaluate(() => window.swingToolTrace);
  const originalSwing = resumed.filter(hit => hit.swingId === swingId);
  assert(originalSwing.length > 0, 'Exercise active-frame enemy checks after closing the menu');
  assert(originalSwing.every(hit => hit.tool === 'review_folder' && hit.visibleTool === 'review_folder'));
  await page.keyboard.press('x', { delay: 30 });
  await page.waitForTimeout(300);
  const trace = await page.evaluate(() => window.swingToolTrace);
  const nextSwing = trace.filter(hit => hit.swingId === swingId + 1);
  assert(nextSwing.length > 0);
  assert(nextSwing.every(hit => hit.tool === 'red_pencil' && hit.visibleTool === 'red_pencil'));
  await shot('next-swing-pencil');
  await writeFile(`${out}/trace.json`, JSON.stringify(trace, null, 2));
  assert.deepEqual(errors, []);
  console.log('PASS real menu swap preserves the committed Folder swing; next swing uses Pencil. Debug tools; hit arguments observed, not a damage test.');
} finally {
  await browser.close();
}
