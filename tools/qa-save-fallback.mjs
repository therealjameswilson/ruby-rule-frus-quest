import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const storageState = JSON.parse(await readFile(process.env.FRUS_QA_STORAGE, 'utf8'));
const out = process.env.FRUS_QA_OUT ?? '/private/tmp/frus-save-fallback';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE });
try {
  const context = await browser.newContext({ storageState });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  const state = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));
  const click = async (x, y) => {
    const b = await page.locator('canvas').first().boundingBox();
    await page.mouse.click(b.x + b.width * x / 256, b.y + b.height * y / 240);
    await page.waitForTimeout(150);
  };
  const resume = async () => {
    await page.waitForFunction(() => window.game?.scene.isActive('TapToStartScene'));
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => window.game.scene.isActive('ArchiveScene'));
    await page.waitForTimeout(900);
  };
  await page.goto('http://127.0.0.1:5195/?text=full'); await resume();
  const points = (await state()).documentPoints;
  const oldTool = await page.evaluate(() => JSON.parse(localStorage.getItem('rubyRuleFrusQuestSave')).state.equippedProcessItem);
  assert.notEqual(oldTool, 'review_folder', 'Fixture must begin with another tool');
  await page.keyboard.press('Escape'); await page.waitForTimeout(180);
  const hit = (await state()).pauseMenu.controls.find(c => c.id === 'tool-2');
  await click(hit.x, hit.y); await click(hit.x, hit.y);
  await page.keyboard.press('Escape'); await page.waitForTimeout(180);
  // Storage fault injection only: inventory is earned and changed through UI.
  await page.evaluate(() => {
    const write = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (this === localStorage && key === 'rubyRuleFrusQuestSave') throw new DOMException('QA quota fault', 'QuotaExceededError');
      return write.call(this, key, value);
    };
  });
  await page.reload();
  await page.waitForFunction(() => window.game?.scene.isActive('TapToStartScene'));
  const stored = await page.evaluate(() => ({
    local: JSON.parse(localStorage.getItem('rubyRuleFrusQuestSave')).state.equippedProcessItem,
    session: JSON.parse(sessionStorage.getItem('rubyRuleFrusQuestSave')).state.equippedProcessItem
  }));
  assert.equal(stored.local, oldTool);
  assert.equal(stored.session, 'review_folder');
  await resume();
  assert.equal((await state()).documentPoints, points);
  await page.keyboard.press('Escape'); await page.waitForTimeout(180);
  assert.equal((await state()).pauseMenu.selectedTool, 'review_folder');
  assert.equal(await page.evaluate(() => sessionStorage.getItem('rubyRuleFrusQuestSave')), null, 'Successful resumed local save clears the old fallback');
  const image = await page.evaluate(() => new Promise(resolve => window.game.renderer.snapshot(i => resolve(i.src))));
  await writeFile(`${out}/continued-folder.png`, Buffer.from(image.split(',')[1], 'base64'));
  assert.deepEqual(errors, []);
  await writeFile(`${out}/result.json`, JSON.stringify({ storedBeforeContinue: stored, restoredTool: 'review_folder', documentPoints: points, errors }, null, 2));
} finally { await browser.close(); }
