import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const base = process.env.FRUS_QA_URL ?? 'http://127.0.0.1:5202/';
const out = process.env.FRUS_QA_OUT ?? '/tmp/ruby-iphone-qa';
await mkdir(out, { recursive: true });
const browser = await chromium.launch();
const results = [];
try {
  for (const device of [
    { name: 'se', width: 375, height: 667, dpr: 2 },
    { name: 'standard', width: 393, height: 852, dpr: 3 },
    { name: 'large', width: 430, height: 932, dpr: 3 }
  ]) {
    const context = await browser.newContext({ viewport: device, deviceScaleFactor: device.dpr, hasTouch: true, isMobile: true,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1' });
    const page = await context.newPage(), cdp = await context.newCDPSession(page), errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    const state = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));
    const point = async (x, y, id = 1) => {
      const b = await page.locator('canvas').first().boundingBox();
      return { x: b.x + x * b.width / 256, y: b.y + y * b.height / 240, id };
    };
    const tap = async (x, y) => { const p = await point(x, y); await page.touchscreen.tap(p.x, p.y); await page.waitForTimeout(160); };
    const drag = async (dx, dy, ms = 400, attack = false) => {
      const origin = await point(40, 178), end = await point(40 + dx, 178 + dy);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [origin] });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [end] });
      if (attack) await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [end, await point(174, 216, 2)] });
      await page.waitForTimeout(ms);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await page.waitForTimeout(120);
    };
    const shot = name => page.screenshot({ path: `${out}/${device.name}-${name}.png` });
    await page.goto(new URL('?scene=OfficeScene&text=full', base).href);
    await page.waitForFunction(() => window.rubyRuleTouchControls?.enabled && JSON.parse(window.render_game_to_text()).scene === 'OfficeScene');
    await page.waitForTimeout(600);
    if (await page.getByRole('button', { name: 'Dismiss', exact: true }).isVisible()) await page.getByRole('button', { name: 'Dismiss', exact: true }).tap();
    await shot('portrait');
    await tap(120, 216);
    assert.equal((await state()).mode, 'pause', 'Visible MENU opens pause');
    for (const [x, name] of [[80, 'map'], [128, 'record'], [176, 'settings'], [32, 'tools']]) {
      await tap(x, 34); assert.equal((await state()).pauseMenu.page, name);
    }
    await shot('menu');
    await tap(224, 34);
    assert.equal((await state()).mode, 'explore');
    await page.goto(new URL('?scene=ArchiveScene&text=full', base).href);
    await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).scene === 'ArchiveScene');
    await page.waitForTimeout(600);
    const start = await state();
    await drag(0, -26, 500, true);
    const moved = await state();
    assert(moved.player.y < start.player.y - 8, 'Thumb moves while B is held');
    assert(moved.playerCombat.weapon.swingId > start.playerCombat.weapon.swingId, 'Second finger swings tool');
    const stopped = moved.player;
    await page.waitForTimeout(220);
    assert.deepEqual((await state()).player, stopped, 'Release stops movement');
    // Rotate with a thumb still down. No stale direction may survive the resize.
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [await point(40, 178)] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [await point(66, 178)] });
    await page.setViewportSize({ width: device.height, height: device.width });
    await page.waitForTimeout(200);
    assert.equal(await page.evaluate(() => window.rubyRuleTouchControls.dpadDirection), null);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    // Simulated notch/home-indicator padding: check the complete canvas fits.
    await page.addStyleTag({ content: 'body { padding: 8px 47px 21px !important; }' });
    await page.evaluate(() => window.dispatchEvent(new Event('resize')));
    await page.waitForTimeout(300);
    const b = await page.locator('canvas').first().boundingBox();
    assert(b.x >= 47 && b.y >= 8 && b.x + b.width <= device.height - 47 + 1 && b.y + b.height <= device.width - 21 + 1);
    await tap(120, 216); assert.equal((await state()).mode, 'pause');
    await tap(224, 34); assert.equal((await state()).mode, 'explore');
    await shot('landscape');
    // Native name field, Cancel/Done, and touch-only entry to gameplay.
    await page.setViewportSize({ width: device.width, height: device.height });
    await page.goto(new URL('?scene=CharacterCreateScene', base).href);
    await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).scene === 'CharacterCreateScene');
    await page.waitForTimeout(450);
    await tap(128, 124);
    const input = page.getByRole('textbox', { name: 'Compiler name', exact: true });
    await input.fill('Ruby');
    await page.setViewportSize({ width: device.width, height: 320 });
    await page.waitForTimeout(150);
    const bounds = await page.getByRole('dialog').boundingBox();
    assert(bounds.y >= 0 && bounds.y + bounds.height <= 320);
    await shot('name-keyboard-space');
    await page.getByRole('button', { name: 'Done', exact: true }).tap();
    await page.setViewportSize({ width: device.width, height: device.height });
    await page.waitForTimeout(200);
    await tap(128, 188);
    await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).scene === 'DanneIntroScene');
    await page.waitForTimeout(300);
    await tap(213, 211);
    await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).scene === 'OfficeScene');
    // Isolated checkpoint fixture; decisions and feedback use real touch controls.
    await page.evaluate(() => {
      const office = window.game.scene.getScene('OfficeScene');
      office.talkJuniorCompiler(); office.handleStarterMemo();
      office.handleStarterMemoInbox(); office.handleStarterMemoInbox();
    });
    await page.waitForTimeout(200);
    assert.equal((await state()).mode, 'choice');
    await shot('research-choice');
    const drainDialog = async () => {
      for (let i = 0; i < 15 && (await state()).mode === 'dialog'; i++) await tap(225, 205);
      assert.notEqual((await state()).mode, 'dialog');
    };
    await tap(225, 205); // Incorrect first decision gives feedback and a retry.
    assert.equal((await state()).mode, 'dialog');
    await shot('research-feedback');
    await drainDialog();
    assert.equal((await state()).mode, 'choice');
    await tap(174, 216); // Route the volume plan.
    await drainDialog();
    assert.equal((await state()).mode, 'choice');
    await tap(225, 205); // Approve source-based research.
    await drainDialog();
    assert.equal((await state()).mode, 'explore');
    assert.equal((await state()).compilerMission.completed, 2);
    await shot('research-approved');
    assert.deepEqual(errors, []);
    results.push({ device, checks: ['menu and all tabs', 'two-finger move and attack', 'release stops', 'rotation releases', 'simulated landscape safe areas', 'native name field and touch begin', 'research checkpoint wrong-answer retry and approval'], errors });
    await context.close();
  }
  await writeFile(`${out}/results.json`, JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
} finally { await browser.close(); }
