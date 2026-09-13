const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const mobile = process.argv.includes('--mobile');
const coaching = process.argv.includes('--coaching');
const out = process.env.FRUS_QA_OUT ?? `/tmp/frus-live-counter-${mobile ? 'mobile' : 'desktop'}`;
const base = process.env.FRUS_QA_URL ?? 'http://127.0.0.1:5195/';
const auditStarted = Date.now();
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_EXECUTABLE ? { executablePath: process.env.CHROMIUM_EXECUTABLE } : {}) });
const context = await browser.newContext({ viewport: mobile ? { width: 375, height: 667 } : { width: 1024, height: 960 }, hasTouch: mobile, isMobile: mobile, deviceScaleFactor: mobile ? 3 : 1 });
const page = await context.newPage(), cdp = await context.newCDPSession(page), errors = [], results = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('console', m => { if (m.type() === 'error')
    errors.push(m.text()); });
const state = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));
async function point(x, y, id = 1) { const b = await page.locator('canvas').first().boundingBox(); return { x: b.x + x * b.width / 256, y: b.y + y * b.height / 240, id }; }
async function touch(x, y, dx = 0, dy = 0, ms = 45) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [await point(x, y)] }); if (dx || dy)
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [await point(x + dx, y + dy)] }); await page.waitForTimeout(ms); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); }
async function click(x, y) { if (mobile)
    await touch(x, y);
else {
    const p = await point(x, y);
    await page.mouse.click(p.x, p.y, { delay: 45 });
} await page.waitForTimeout(100); }
async function press(key = 'Space', wait = 150) { if (mobile)
    await touch(...(key === 'x' ? [174, 216] : key === 'm' ? [224, 16] : [225, 205]));
else
    await page.keyboard.press(key, { delay: 45 }); await page.waitForTimeout(wait); }
async function direction(key, ms = 85) { if (mobile) {
    const [dx, dy] = { ArrowLeft: [-26, 0], ArrowRight: [26, 0], ArrowUp: [0, -26], ArrowDown: [0, 26] }[key];
    await touch(40, 178, dx, dy, ms);
}
else {
    await page.keyboard.down(key);
    await page.waitForTimeout(ms);
    await page.keyboard.up(key);
} await page.waitForTimeout(20); }
async function move(x, y) { for (let n = 0; n < 120; n++) {
    const s = await state(), dx = x - s.player.x, dy = y - s.player.y;
    if (Math.hypot(dx, dy) < 5)
        return;
    assert.equal(s.mode, 'explore');
    // Taper input near the target so a fixed burst cannot oscillate across
    // the arrival radius with the faster controller and real-time scheduling.
    const duration = Math.max(20, Math.min(85, Math.max(Math.abs(dx), Math.abs(dy)) * 7));
    await direction(Math.abs(dx) > Math.abs(dy) ? dx > 0 ? 'ArrowRight' : 'ArrowLeft' : dy > 0 ? 'ArrowDown' : 'ArrowUp', duration);
} throw Error(`movement failed ${x},${y}`); }
async function scene(key) { await page.waitForFunction(key => window.render_game_to_text && JSON.parse(window.render_game_to_text()).scene === key, key); await page.waitForTimeout(650); }
async function shot(label) { const s = await state(); results.push({ label, elapsedMs: Date.now() - auditStarted, state: s }); const data = await page.evaluate(() => new Promise(resolve => window.game.renderer.snapshot(i => resolve(i.src)))); await writeFile(`${out}/${label}-native.png`, Buffer.from(data.split(',')[1], 'base64')); await page.screenshot({ path: `${out}/${label}.png` }); await context.storageState({ path: `${out}/earned-storage.json` }); console.log(label, s.scene, s.guideCounter?.phase, s.guideCounter?.attempts, s.reliability); }
async function phase(value) { await page.waitForFunction(value => JSON.parse(window.render_game_to_text()).guideCounter?.phase === value, value, { timeout: 12000, polling: 'raf' }); }
try {
    await page.goto(new URL('?text=full', base).href);
    await scene('WarningScene');
    await shot('opening-warning');
    assert.equal(await page.evaluate(() => localStorage.getItem('rubyRuleFrusQuestSave')), null);
    await page.waitForTimeout(1200);
    if (mobile)
        await click(128, 200);
    else
        await press('Enter');
    await scene('TitleScene');
    if (mobile)
        await click(128, 206);
    else
        await press('Enter');
    await scene('CharacterCreateScene');
    await shot('opening-compiler');
    if (mobile)
        await click(128, 190);
    else
        await press('Enter');
    await scene('OfficeScene');
    async function assertOfficeApproach() {
      await page.waitForFunction(() => {
        const ui=window.game.scene.getScene('UIScene');
        return ui.questBandCueText.text==='FOLLOW GOLD ARROW' && ui.questBandVerbText.text==='!';
      });
      assert(await page.evaluate(()=>window.game.scene.getScene('OfficeScene').firstQuestCue.visible));
      const cue = await page.evaluate(() => {
        const office = window.game.scene.getScene('OfficeScene');
        const target = office.currentGuidedTarget();
        const junior = ['talk_jr', 'recover_key'].includes(office.officeStarterStage());
        const arrow = office.firstQuestCue.getBounds();
        return { x: office.firstQuestCue.x, y: office.firstQuestCue.y,
          bottom: arrow.bottom, top: junior ? office.juniorCompiler.visualTop : target.y - 13 };
      });
      assert(Number.isInteger(cue.x) && Number.isInteger(cue.y), 'Quest arrow must stay pixel-snapped');
      assert(cue.bottom < cue.top, 'Quest arrow must be above the target, not inside the character art');
    }
    await assertOfficeApproach();
    await shot('opening-office');
    if (process.argv.includes('--muted-travel')) {
      await page.keyboard.press('n', { delay: 45 });
      await page.waitForTimeout(100);
      assert.equal(await page.evaluate(() => window.rubyRuleAudioDebug().enabled), false);
    }
    if (process.argv.includes('--early-route')) {
      await move(128, 215);
      assert.equal(await page.evaluate(() => window.game.scene.getScene('OfficeScene').prompt.currentText), 'CHECK ARCHIVE LOCK');
      await shot('early-door-prompt');
      await press();
      assert.equal((await state()).mode, 'explore', 'A locked door check must not block movement');
      assert(!(await state()).sceneProgress.juniorCompilerIntroduced, 'The warning cannot grant the assignment');
      const before = (await state()).player;
      await shot('early-door-hint');
      await direction('ArrowRight', 140);
      assert((await state()).player.x > before.x + 5, 'The hero can walk away while the hint is visible');
      await move(128, 185);
    }
    await move(128, 122);
    if (process.argv.includes('--nearby-jr')) {
      await press();
      assert(!(await state()).sceneProgress.juniorCompilerIntroduced, 'The briefing must not trigger across the room');
      assert.equal((await state()).mode, 'explore');
      await shot('jr-out-of-reach');
    }
    await move(90, 122);
    if (process.argv.includes('--nearby-jr')) {
      await direction('ArrowLeft', 110);
      const hero = (await state()).player;
      assert(hero.x >= 82, 'JR feet must stop a direct walk through the colleague');
      await shot('jr-feet-contact');
    }
    await move(100, 122);
    await press();
    await shot('opening-assignment');
    assert.match((await state()).latestMessage, /publish a reliable FRUS volume/);
    await move(128, 138);
    await press();
    await assertOfficeApproach();
    await shot('opening-memo');
    await move(128, 185);
    await move(60, 185);
    await page.waitForFunction(()=>{
      const ui=window.game.scene.getScene('UIScene');
      return ui.questBandCueText.text.includes('ROUTE MEMO') && ui.questBandVerbText.text!=='!';
    });
    await press();
    if (process.argv.includes('--office-cues')) {
      await shot('opening-memo-filed');
      await page.waitForFunction(() => {
        const ui=window.game.scene.getScene('UIScene');
        return JSON.parse(window.render_game_to_text()).nearestInteractable === 'Stamp Memo'
          && ui.questBandCueText.text.includes('STAMP MEMO');
      }, {}, { timeout: 2000 });
      assert.equal((await state()).sceneProgress.officeStarterMemoStatus, 2);
    }
    await press();
    await shot('opening-door-unlocked');
    if (process.argv.includes('--office-cues')) {
      const activeIds = await page.evaluate(() => window.game.scene.getScene('OfficeScene').currentInteractables().map(target => target.id));
      assert(!activeIds.includes('starter-memo'), 'Completed memo must not retake interaction focus');
      assert(!activeIds.includes('production-inbox'), 'Stamped inbox must retire its opening-task prompt');
      assert(activeIds.includes('archive-guide-door') && activeIds.includes('junior-compiler'));
    }
    await move(128, 200);
    await press();
    await scene('GuideScene');
    if (process.argv.includes('--muted-travel')) {
      const muted = await page.evaluate(() => window.rubyRuleAudioDebug());
      assert.equal(muted.enabled, false);
      assert.equal(muted.musicTimerActive, false);
      await page.keyboard.press('n', { delay: 45 });
      await page.waitForTimeout(300);
      const audio = await page.evaluate(() => window.rubyRuleAudioDebug());
      results.push({ label: 'unmuted-after-travel', audio });
      assert.equal(audio.currentSceneKey, 'ArchiveScene', 'Guide requests the Archive theme; unmuting must not restore Office');
      assert.equal(audio.currentThemeKey, 'archiveDungeon');
      assert.equal(audio.contextState, 'running');
      assert.equal(audio.musicTimerActive, true);
      await shot('guide-music-restored');
    }
    if (coaching) {
        // Input-only perimeter check: the player must stay on the room's floor.
        await direction('ArrowRight', 2500);
        await direction('ArrowDown', 2500);
        assert.deepEqual((await state()).player, { x: 216, y: 180 });
        await shot('00-south-east-wall');
        await direction('ArrowLeft', 4000);
        await direction('ArrowUp', 2500);
        assert.deepEqual((await state()).player, { x: 40, y: 70 });
        await shot('00-north-west-wall');
    }
    await move(96, 154);
    await press();
    await shot('01-stamp-earned');
    if (coaching) {
        await direction('ArrowLeft', 20);
        await press('x', 100);
        assert.equal((await state()).guideCounter.cue, 'faceEast');
        assert(!(await state()).sceneProgress.guideCitationCounterTrained);
        await shot('01-face-the-bolt');
    }
    const baseline = await state();
    await phase('incoming');
    await shot('02-live-bolt');
    await phase('ready');
    const miss = await state();
    assert.equal(miss.reliability, baseline.reliability);
    assert(!miss.sceneProgress.guideCitationCounterTrained);
    await shot('03-harmless-miss');
    await phase('charging');
    await shot('04-aim-warning');
    await phase('incoming');
    await press('m');
    assert.equal((await state()).mode, 'pause');
    const stopped = (await state()).guideCounter, swingId = (await state()).playerCombat.weapon.swingId;
    await page.waitForTimeout(2200);
    assert.deepEqual((await state()).guideCounter, stopped);
    await shot('05-paused-bolt');
    if (mobile) {
        const close = (await state()).pauseMenu.controls.find(c => c.id === 'close');
        await click(close.x, close.y);
    }
    else
        await press('Escape');
    await page.waitForTimeout(100);
    assert.equal((await state()).mode, 'explore');
    assert.equal((await state()).playerCombat.weapon.swingId, swingId);
    // A is interaction, not the counter. It must not clear the lesson.
    await press();
    assert(!((await state()).sceneProgress.guideCitationCounterTrained));
    assert.equal((await state()).mode, 'explore');
    assert(await page.evaluate(() => window.game.scene.getScene('GuideScene').toast.visible), 'Wrong button guidance must be visible, not just an internal message');
    await shot('05-use-swing-button');
    if (coaching) {
        // Follow the displayed direction and timing cue at the pickup position,
        // without knowing bolt coordinates or moving to a precomputed counter spot.
        const cues = { faceNorth: 'ArrowUp', faceSouth: 'ArrowDown', faceEast: 'ArrowRight', faceWest: 'ArrowLeft' };
        for (let n = 0; n < 80; n++) {
            const cue = (await state()).guideCounter?.cue;
            if (cues[cue]) await direction(cues[cue], 20);
            if ((await state()).guideCounter?.cue === 'swing') break;
            await page.waitForTimeout(100);
        }
        assert.equal((await state()).guideCounter.cue, 'swing');
        // Act immediately so screenshot capture cannot consume the timing window.
        await press('x', 10);
        await page.waitForFunction(() => {
            const s = JSON.parse(window.render_game_to_text());
            return s.guideCounter?.phase === 'returned' || s.sceneProgress.guideCitationCounterTrained === 1;
        }, null, { timeout: 2000, polling: 'raf' });
        await shot('06-coached-counter');
        await page.waitForTimeout(900);
    } else {
        await move(176, 174);
        await direction('ArrowUp', 20);
    }
    for (let attempt = 0; attempt < 8 && !((await state()).sceneProgress.guideCitationCounterTrained); attempt++) {
        await page.waitForFunction(() => { const s = JSON.parse(window.render_game_to_text()), b = s.guideCounter?.bolt; return b && !b.returned && Math.abs(b.x - s.player.x) < 10 && b.y < s.player.y - 27 && b.y > s.player.y - 43; }, null, { timeout: 12000, polling: 'raf' });
        if (mobile) {
            const start = await point(40, 178, 1), pad = await point(40, 152, 1), button = await point(174, 216, 2);
            await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [start] });
            await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [pad] });
            await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [pad, button] });
            await page.waitForTimeout(45);
            const both = await page.evaluate(() => window.rubyRuleTouchControls);
            assert.equal(both.dpadDirection, 'up');
            assert(both.pressedButtons.includes('b'));
            results.push({ label: 'two-pointers', touch: both });
            await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [pad] });
            await page.waitForTimeout(25);
            await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        }
        else
            await press('x', 10);
        await page.waitForFunction(() => { const s = JSON.parse(window.render_game_to_text()); return s.guideCounter?.phase === 'returned' || s.sceneProgress.guideCitationCounterTrained === 1; }, null, { timeout: 2000, polling: 'raf' });
        await shot('06-returned-bolt');
        await page.waitForTimeout(650);
    }
    const cleared = await state();
    assert.equal(cleared.sceneProgress.guideCitationCounterTrained, 1);
    assert.equal(cleared.reliability, baseline.reliability);
    assert.equal(cleared.documentPoints, baseline.documentPoints);
    assert.equal(cleared.guideCounter, null);
    await shot('07-fragment-revealed');
    await move(160, 154);
    await press('x');
    assert(!(await state()).volumeFragments.includes('Front Matter Fragment'), 'A tool swing is not the pickup action');
    await press();
    assert((await state()).volumeFragments.includes('Front Matter Fragment'));
    await page.waitForFunction(() => {
      const ui = window.game.scene.getScene('UIScene');
      return ui.questBandCueText.text === 'WALK THROUGH OPEN GATE' && ui.questBandVerbText.text === '!';
    });
    assert(await page.evaluate(() => window.game.scene.getScene('GuideScene').children.getByName('front-matter-reveal')?.visible));
    const pickupPosition = (await state()).player;
    await direction('ArrowDown', 100);
    assert((await state()).player.y > pickupPosition.y + 3, 'Reward reveal must not lock movement');
    await shot('07-front-matter-collected');
    const earned = await state();
    await press();
    assert.equal((await state()).documentPoints, earned.documentPoints);
    await page.reload();
    await scene('TapToStartScene');
    if (mobile)
        await click(86, 154);
    else
        await press('Enter');
    await scene('GuideScene');
    assert.equal((await state()).sceneProgress.guideCitationCounterTrained, 1);
    assert.equal((await state()).guideCounter, null);
    await shot('08-continued-gate');
    await context.storageState({ path: `${out}/earned-guide-storage.json` });
    await move(128, 170);
    await press();
    await scene('ArchiveScene');
    await shot('09-archive-entry');
    assert.equal((await state()).guideCounter, null);
    assert.deepEqual(errors, []);
    console.log('PASS', mobile ? 'touch' : 'desktop', 'fresh opening, harmless miss, pause, return, reward, Continue, Archive');
}
catch (error) {
    process.exitCode = 1;
    console.error(error);
    await shot('failure').catch(() => { });
    results.push({ failure: String(error) });
}
finally {
    await writeFile(`${out}/results.json`, JSON.stringify({ results, errors }, null, 2));
    await browser.close();
}
