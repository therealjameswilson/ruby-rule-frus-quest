import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
assert(process.env.FRUS_QA_STORAGE, 'Use an isolated copy of an earned save');
const mobile = process.argv.includes('--mobile');
const out = process.env.FRUS_QA_OUT ?? '/private/tmp/frus-save-confirmation';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE });
try {
  const context = await browser.newContext({ storageState: process.env.FRUS_QA_STORAGE,
    viewport: mobile ? { width: 375, height: 667 } : { width: 1024, height: 960 },
    hasTouch: mobile, isMobile: mobile });
  const page = await context.newPage(), errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  const cdp = mobile ? await context.newCDPSession(page) : null;
  const menu = () => page.evaluate(() => {
    const scene = window.game.scene.getScene('TapToStartScene');
    return { confirming: scene.confirmingNew, selected: scene.selectedAction };
  });
  const choose = async (side) => {
    if (mobile) {
      const box = await page.locator('canvas').first().boundingBox();
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 1,
        x: box.x + (side === 'new' ? 170 : 86) * box.width / 256,
        y: box.y + 154 * box.height / 240 }] });
      await page.waitForTimeout(60);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    } else {
      if ((await menu()).selected !== side) await page.keyboard.press('ArrowRight', { delay: 60 });
      await page.keyboard.press('Enter', { delay: 60 });
    }
    await page.waitForTimeout(250);
  };
  await page.goto('http://127.0.0.1:5195/');
  await page.waitForFunction(() => window.game?.scene.isActive('TapToStartScene'));
  const saved = () => page.evaluate(() => localStorage.getItem('rubyRuleFrusQuestSave'));
  const before = await saved(); assert(before);
  if (mobile) assert(await page.evaluate(() => window.game.scene.getScene('TapToStartScene').children.list
    .some(node => node.text === 'TAP YOUR CHOICE')));
  await choose('new');
  assert.deepEqual(await menu(), { confirming: true, selected: 'continue' });
  assert.equal(await saved(), before);
  await page.screenshot({ path: `${out}/confirmation.png` });
  if (!mobile) {
    await page.keyboard.press('ArrowRight', { delay: 60 });
    assert.equal((await menu()).selected, 'new');
    const box = await page.locator('canvas').first().boundingBox();
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 3);
    await page.waitForTimeout(300);
    assert.equal(await saved(), before, 'Background clicks must not replace a selected save');
    assert.equal((await menu()).confirming, true);
  }
  await choose('continue');
  assert.equal((await menu()).confirming, false);
  assert.equal(await saved(), before);
  await choose('new');
  await choose('new');
  await page.waitForFunction(() => window.game.scene.isActive('TitleScene'));
  assert.equal(await saved(), null);
  await page.screenshot({ path: `${out}/new-run.png` });
  assert.deepEqual(errors, []);
  await writeFile(`${out}/result.json`, JSON.stringify({ mobile, cancelledSaveUnchanged: true, explicitReplacement: true, errors }));
  console.log('PASS confirmation, cancellation and explicit replacement in isolated browser storage');
} finally { await browser.close(); }
