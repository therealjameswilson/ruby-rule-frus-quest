import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const out = process.env.FRUS_QA_OUT ?? '/tmp/frus-attack-buffer';
const touch = process.argv.includes('--touch');
const gap = process.argv.includes('--rapid') ? 35 : 110;
const scenes = process.argv.includes('--chapters')
  ? ['ArchiveScene', 'NetworkScene', 'ReferralVaultScene', 'SilentReadScene']
  : process.argv.includes('--guide') ? ['GuideScene'] : ['BlackVaultLairScene', 'GameplayMapScene'];
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE });
const results = [];
try {
  for (const sceneKey of scenes) {
    if (sceneKey === 'ArchiveScene') assert(process.env.FRUS_QA_STORAGE, 'Archive timing QA needs an earned Archive save with the stamp');
    const page = await browser.newPage({
      ...(sceneKey === 'ArchiveScene' ? { storageState: process.env.FRUS_QA_STORAGE } : {}),
      ...(touch ? { viewport: { width: 375, height: 667 }, hasTouch: true, isMobile: true, deviceScaleFactor: 3 } : {})
    }), errors = [];
    const cdp = await page.context().newCDPSession(page);
    page.on('pageerror', e => errors.push(String(e)));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    // Isolated input QA, not an earned-progression run: the generic map has no
    // weapon by default. Use its supported combat-tool debug fixture.
    await page.goto(`${process.env.FRUS_QA_URL ?? 'http://127.0.0.1:5195/'}${sceneKey === 'ArchiveScene' ? '?text=full' : `?scene=${sceneKey}&text=full&give=combat-tools&equip=citation_stamp`}`);
    if (sceneKey === 'ArchiveScene') {
      await page.waitForFunction(() => window.render_game_to_text && JSON.parse(window.render_game_to_text()).scene === 'TapToStartScene');
      await page.keyboard.press('Enter');
    }
    await page.waitForFunction(key => window.game?.scene?.getScene(key)?.player, sceneKey);
    await page.waitForTimeout(1100);
    if (sceneKey === 'GuideScene') {
      // The lesson has no grant cheat: walk into reach and earn its stamp.
      await page.keyboard.down('ArrowLeft');
      await page.waitForTimeout(200);
      await page.keyboard.up('ArrowLeft');
      await page.keyboard.press('Space');
      await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).guideCounter !== null);
    }
    await page.evaluate(key => {
      window.attackBufferSamples = [];
      const scene = window.game.scene.getScene(key);
      scene.events.on('postupdate', () => {
        const weapon = scene.player.combatReadout.weapon;
        const previous = window.attackBufferSamples.at(-1);
        if (!previous || previous.phase !== weapon.phase || previous.swingId !== weapon.swingId) {
          window.attackBufferSamples.push({ time: scene.time.now, phase: weapon.phase,
            swingId: weapon.swingId, remaining: weapon.cooldownMsRemaining });
        }
      });
    }, sceneKey);
    const weapon = () => page.evaluate(key => window.game.scene.getScene(key).player.combatReadout.weapon, sceneKey);
    async function press(key) {
      if (!touch) return page.keyboard.press(key, { delay: 20 });
      let target = key === 'x' ? { x: 174, y: 216 } : { x: 224, y: 16 };
      if (key === 'm') {
        const pause = await page.evaluate(() => JSON.parse(window.render_game_to_text()).pauseMenu);
        if (pause) {
          const close = pause.controls.find(control => control.id === 'close');
          assert(close, 'Touch pause menu needs a close target');
          target = close;
        }
      }
      const b = await page.locator('canvas').first().boundingBox();
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: b.x + target.x * b.width / 256, y: b.y + target.y * b.height / 240, id: 1 }] });
      await page.waitForTimeout(20);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    }
    async function ready() {
      await page.waitForFunction(key => window.game.scene.getScene(key).player.combatReadout.weapon.canSwing, sceneKey);
    }
    async function lateWindow() {
      await page.waitForFunction(key => {
        const w = window.game.scene.getScene(key).player.combatReadout.weapon;
        return w.phase === 'cooldown' && w.cooldownMsRemaining <= 90;
      }, sceneKey, { polling: 'raf' });
      const w = await weapon();
      assert(w.cooldownMsRemaining > 25, 'Tap must actually precede recovery');
    }
    await ready();
    const initial = (await weapon()).swingId;
    await press('x');
    try { await lateWindow(); } catch (error) {
      const diagnostic = await page.evaluate(() => ({ samples: window.attackBufferSamples,
        state: JSON.parse(window.render_game_to_text()) }));
      await writeFile(`${out}/${sceneKey}-failure.json`, JSON.stringify(diagnostic, null, 2));
      const image = await page.evaluate(() => new Promise(resolve => window.game.renderer.snapshot(i => resolve(i.src))));
      await writeFile(`${out}/${sceneKey}-failure.png`, Buffer.from(image.split(',')[1], 'base64'));
      throw error;
    }
    await press('x');
    await page.waitForFunction(({ key, id }) => window.game.scene.getScene(key).player.actionId === id + 2, { key: sceneKey, id: initial });
    const image = await page.evaluate(() => new Promise(resolve => window.game.renderer.snapshot(i => resolve(i.src))));
    await writeFile(`${out}/${sceneKey}.png`, Buffer.from(image.split(',')[1], 'base64'));
    await ready(); await page.waitForTimeout(150);
    assert.equal((await weapon()).swingId, initial + 2, 'One tap queues exactly one swing');
    await press('x'); await page.waitForTimeout(gap); await press('x');
    await ready(); await page.waitForTimeout(160);
    assert.equal((await weapon()).swingId, initial + 3, 'Too-early taps expire');
    await press('x'); await page.waitForTimeout(gap); await press('x');
    await page.waitForFunction(key => window.game.scene.getScene(key).attackBuffer.bufferedUntil !== null, sceneKey, { polling: 'raf', timeout: 1000 });
    assert.notEqual(await page.evaluate(key => window.game.scene.getScene(key).attackBuffer.bufferedUntil, sceneKey), null, 'Cancellation starts with a genuinely queued tap');
    assert.equal((await weapon()).swingId, initial + 4, 'Queued tap has not fired before pause');
    await press('m');
    assert.equal(await page.evaluate(() => JSON.parse(window.render_game_to_text()).mode), 'pause');
    assert.equal(await page.evaluate(key => window.game.scene.getScene(key).attackBuffer.bufferedUntil, sceneKey), null, 'Menu clears the buffer immediately');
    const pauseImage = await page.evaluate(() => new Promise(resolve => window.game.renderer.snapshot(i => resolve(i.src))));
    await writeFile(`${out}/${sceneKey}-paused.png`, Buffer.from(pauseImage.split(',')[1], 'base64'));
    await page.waitForTimeout(150); await press('m'); await ready(); await page.waitForTimeout(160);
    assert.equal((await weapon()).swingId, initial + 4, 'Pause clears a pending swing');
    if (process.argv.includes('--background')) {
      await press('x'); await page.waitForTimeout(35); await press('x');
      const before = (await weapon()).swingId;
      assert.notEqual(await page.evaluate(key => window.game.scene.getScene(key).attackBuffer.bufferedUntil, sceneKey), null);
      // Browser lifecycle proxy, not physical-device background certification.
      await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide')));
      assert(await page.evaluate(key => window.game.scene.isPaused(key), sceneKey));
      assert.equal(await page.evaluate(key => window.game.scene.getScene(key).attackBuffer.bufferedUntil, sceneKey), null, 'Backgrounding must immediately clear pending input');
      await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow')));
      assert(await page.locator('#tap-resume-overlay').isVisible());
      await press('x');
      await ready(); await page.waitForTimeout(160);
      assert.equal((await weapon()).swingId, before, 'Returning from background must cancel a pending swing and swallow resume input');
      const snapshot = await page.evaluate(() => new Promise(resolve => window.game.renderer.snapshot(i => resolve(i.src))));
      await writeFile(`${out}/${sceneKey}-background.png`, Buffer.from(snapshot.split(',')[1], 'base64'));
    }
    if (touch) {
      const position = () => page.evaluate(key => window.game.scene.getScene(key).player.position, sceneKey);
      const before = await position();
      const bounds = await page.locator('canvas').first().boundingBox();
      const point = x => ({ x: bounds.x + x * bounds.width / 256, y: bounds.y + 178 * bounds.height / 240, id: 2 });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point(40)] });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [point(14)] });
      await page.waitForTimeout(120);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await page.waitForTimeout(40);
      const stopped = await position();
      assert(stopped.x < before.x, 'Touch movement resumes after closing the menu');
      await page.waitForTimeout(100);
      assert.deepEqual(await position(), stopped, 'Released touch movement does not drift');
      assert.equal((await weapon()).swingId, initial + (process.argv.includes('--background') ? 5 : 4), 'Resumed movement does not leak a queued attack');
      const resumedImage = await page.evaluate(() => new Promise(resolve => window.game.renderer.snapshot(i => resolve(i.src))));
      await writeFile(`${out}/${sceneKey}-resumed.png`, Buffer.from(resumedImage.split(',')[1], 'base64'));
    }
    assert.deepEqual(errors, []);
    results.push({ sceneKey, toolInput: touch ? 'touch' : 'keyboard', pauseInput: touch ? 'touch' : 'keyboard', gap,
      lateTapQueuedOnce: true, earlyTapExpired: true, pauseCleared: true,
      backgroundResumeSwallowed: process.argv.includes('--background') ? true : null,
      touchMovementRecovered: touch ? true : null,
      touchReleaseStoppedMovement: touch ? true : null,
      resumedMovementDidNotAttack: touch ? true : null,
      errors });
    await page.close();
  }
} finally {
  await writeFile(`${out}/results.json`, JSON.stringify(results, null, 2));
  await browser.close();
}
console.log(JSON.stringify(results, null, 2));
