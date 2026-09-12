import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const out = process.env.FRUS_QA_OUT ?? '/private/tmp/frus-title-language';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE });
const mobile = process.argv.includes('--mobile');
const context = await browser.newContext({ viewport: { width: 375, height: 667 }, hasTouch: mobile,
  isMobile: mobile, deviceScaleFactor: 3 });
const page = await context.newPage();
const cdp = await context.newCDPSession(page);
const errors = [];
page.on('pageerror', error => errors.push(String(error)));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
async function click(x, y) {
  const box = await page.locator('canvas').first().boundingBox();
  const p = { x: box.x + x * box.width / 256, y: box.y + y * box.height / 240 };
  if (mobile) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...p, id: 1 }] });
    await page.waitForTimeout(45);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  } else await page.mouse.click(p.x, p.y, { delay: 45 });
}
try {
  await page.goto(`${process.env.FRUS_QA_URL ?? 'http://127.0.0.1:5195/'}?scene=TitleScene`);
  await page.waitForFunction(() => window.render_game_to_text && JSON.parse(window.render_game_to_text()).scene === 'TitleScene');
  const translations = [['en', 'BEGIN QUEST'], ['es', 'EMPEZAR MISIÓN'], ['fr', 'COMMENCER LA QUÊTE'], ['en', 'BEGIN QUEST']];
  for (const [index, [language, command]] of translations.entries()) {
    if (index > 0) await click(49, 234);
    await page.waitForTimeout(700);
    const title = await page.evaluate(() => {
      const scene = window.game.scene.getScene('TitleScene');
      return { scene: JSON.parse(window.render_game_to_text()).scene,
        command: scene.children.getByName('title-clean-art-start')?.text,
        goal: scene.children.getByName('title-clean-art-goal')?.getBounds() };
    });
    assert.equal(title.scene, 'TitleScene', 'Language click must not begin the quest');
    assert.equal(title.command, command);
    if (mobile) {
      assert.equal(await page.evaluate(() => window.rubyRuleTouchControls?.enabled), false,
        'Gameplay touch controls must not cover the title');
    }
    assert(title.goal.x >= 0 && title.goal.x + title.goal.width <= 256);
    assert(title.goal.y + title.goal.height < 52, 'Goal must stay above book artwork');
    const image = await page.evaluate(() => new Promise(resolve => window.game.renderer.snapshot(image => resolve(image.src))));
    await writeFile(`${out}/${language}-native.png`, Buffer.from(image.split(',')[1], 'base64'));
  }
  await click(128, 204);
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).scene === 'CharacterCreateScene');
  if (mobile) await page.waitForFunction(() => window.rubyRuleTouchControls?.enabled === true);
  assert.deepEqual(errors, []);
  await writeFile(`${out}/result.json`, JSON.stringify({ mobile, languages: ['en', 'es', 'fr'], startsCharacterCreation: true, errors }, null, 2));
} finally { await browser.close(); }
