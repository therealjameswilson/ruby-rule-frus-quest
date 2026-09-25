import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const browser = await chromium.launch({ channel: 'chrome', args: ['--use-angle=metal'] });
try {
  const page = await browser.newPage();
  const errors = []; page.on('pageerror', e => errors.push(String(e)));
  await page.goto(new URL('?scene=ResearchWorldScene', process.env.FRUS_QA_URL ?? 'http://127.0.0.1:5211/').href);
  await page.waitForFunction(() => window.game?.scene.isActive('ResearchWorldScene'));
  await page.evaluate(() => {
    const s = window.game.scene.getScene('ResearchWorldScene');
    window.crossingCosts = [];
    window.crossingPixelReads = 0;
    const readAlpha = s.textures.getPixelAlpha;
    s.textures.getPixelAlpha = function(...args) { window.crossingPixelReads++; return readAlpha.apply(this, args); };
    window.initialGrounding = JSON.stringify([s.player.groundOffsets, s.player.poseScales, s.player.poseOffsetsX]);
    for (const [owner, name] of [[s, 'create'], [s, 'preload'], [s.sys, 'shutdown']]) {
      const original = owner[name];
      owner[name] = function(...args) {
        const start = performance.now();
        const value = original.apply(this, args);
        window.crossingCosts.push({ phase: name, ms: performance.now() - start });
        return value;
      };
    }
  });
  const cdp = await page.context().newCDPSession(page);
  if (process.env.FRUS_QA_CPU_PROFILE) {
    await cdp.send('Profiler.enable'); await cdp.send('Profiler.start');
  }
  const crossings = [];
  for (let i = 0; i < 8; i++) {
    await page.waitForFunction(() => !window.game.scene.getScene('ResearchWorldScene').load.isLoading());
    await page.waitForTimeout(300);
    const before = await page.evaluate(() => {
      const s = window.game.scene.getScene('ResearchWorldScene');
      // Only approach placement is a fixture; the boundary input triggers travel.
      s.player.setPosition(s.zone === 1 ? 247 : 8, 135);
      window.crossingFrames = []; let last = performance.now();
      window.crossingObserver = () => { const now = performance.now(); window.crossingFrames.push(now - last); last = now; };
      window.game.events.on('step', window.crossingObserver);
      return { zone: s.zone, disguise: s.disguise, nextReady: s.textures.exists(`danne-disguise-${(s.disguise + 1) % 20}`) };
    });
    await page.keyboard.down(before.zone === 1 ? 'ArrowRight' : 'ArrowLeft');
    await page.waitForFunction(zone => window.game.scene.getScene('ResearchWorldScene').zone !== zone, before.zone);
    await page.keyboard.up(before.zone === 1 ? 'ArrowRight' : 'ArrowLeft');
    await page.waitForTimeout(150);
    crossings.push(await page.evaluate(before => {
      window.game.events.off('step', window.crossingObserver);
      const s = window.game.scene.getScene('ResearchWorldScene');
      return { from: before.zone, to: s.zone, disguise: s.disguise, nextReady: before.nextReady,
        sameGrounding: JSON.stringify([s.player.groundOffsets, s.player.poseScales, s.player.poseOffsetsX]) === window.initialGrounding,
        maxMs: Math.max(...window.crossingFrames), frames: window.crossingFrames.length };
    }, before));
  }
  assert.deepEqual(errors, []);
  assert(crossings.every(c => c.sameGrounding), 'Room changes preserve pose alignment');
  const pixelReads = await page.evaluate(() => window.crossingPixelReads);
  assert.equal(pixelReads, 0, 'Cached hero poses must not rescan pixels on each crossing');
  await page.screenshot({ path: '/tmp/world-crossing-pacing.png' });
  if (process.env.FRUS_QA_CPU_PROFILE) {
    const { profile } = await cdp.send('Profiler.stop');
    await writeFile(process.env.FRUS_QA_CPU_PROFILE, JSON.stringify(profile));
  }
  const result = { fixture: 'edge approach placement; real keyboard boundary input', crossings,
    costs: await page.evaluate(() => window.crossingCosts), pixelReads, errors };
  await writeFile('/tmp/world-crossing-pacing.json', JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
} finally { await browser.close(); }
