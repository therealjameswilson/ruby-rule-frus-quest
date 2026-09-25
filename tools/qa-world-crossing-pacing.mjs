import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const browser = await chromium.launch({ channel: 'chrome', args: ['--use-angle=metal'] });
try {
  const page = await browser.newPage();
  const errors = []; page.on('pageerror', e => errors.push(String(e)));
  await page.goto(new URL('?scene=ResearchWorldScene', process.env.FRUS_QA_URL ?? 'http://127.0.0.1:5211/').href);
  await page.waitForFunction(() => window.game?.scene.isActive('ResearchWorldScene'));
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
        maxMs: Math.max(...window.crossingFrames), frames: window.crossingFrames.length };
    }, before));
  }
  assert.deepEqual(errors, []);
  const result = { fixture: 'edge approach placement; real keyboard boundary input', crossings, errors };
  await writeFile('/tmp/world-crossing-pacing.json', JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
} finally { await browser.close(); }
