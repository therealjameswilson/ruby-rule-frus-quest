import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const out = process.env.FRUS_QA_OUT ?? '/tmp/frus-dispatch-safety';
const base = process.env.FRUS_QA_URL ?? 'http://127.0.0.1:5195/';
assert(process.env.FRUS_QA_STORAGE, 'Use dispatch-copy-storage.json earned by qa-referral-manifest.mjs');
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true,
  ...(process.env.CHROMIUM_EXECUTABLE ? { executablePath: process.env.CHROMIUM_EXECUTABLE } : {}) });
const cases = [
  ['without-crank', process.env.FRUS_QA_STORAGE, false],
  ['missing-packed-tiles', process.env.FRUS_QA_STORAGE, true]
];
if (process.env.FRUS_QA_LEGACY_STORAGE) cases.push(['old-completed', process.env.FRUS_QA_LEGACY_STORAGE, false]);
const results = [];
try {
  for (const [name, storage, fallback] of cases) {
    const context = await browser.newContext({ storageState: JSON.parse(await readFile(storage, 'utf8')),
      viewport: { width: 1024, height: 960 } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(String(error)));
    if (fallback) await page.route('**/tileset_interiors_16x16_native.png', route => route.abort());
    const state = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));
    const press = async key => { await page.keyboard.press(key, { delay: 50 }); await page.waitForTimeout(180); };
    async function promptShot(label, expected) {
      await page.waitForFunction(expected => {
        const prompt = window.game.scene.getScene('ReferralVaultScene').interactionPrompt;
        return prompt.visible && prompt.currentText === expected;
      }, expected);
      const image = await page.evaluate(() => new Promise(resolve => window.game.renderer.snapshot(image => resolve(image.src))));
      await writeFile(`${out}/${name}-${label}-native.png`, Buffer.from(image.split(',')[1], 'base64'));
    }
    async function move(x, y, room) {
      for (let i = 0; i < 220; i++) {
        const s = await state();
        if (room && s.roomTraversal?.currentRoomId === room) { await page.waitForTimeout(650); return; }
        const dx = x - s.player.x, dy = y - s.player.y;
        if (!room && Math.hypot(dx, dy) < 5) return;
        const direction = Math.abs(dx) > Math.abs(dy)
          ? dx > 0 ? 'ArrowRight' : 'ArrowLeft' : dy > 0 ? 'ArrowDown' : 'ArrowUp';
        await page.keyboard.down(direction); await page.waitForTimeout(70);
        await page.keyboard.up(direction); await page.waitForTimeout(25);
      }
      throw Error(`${name} stalled toward ${x},${y}: ${JSON.stringify((await state()).player)}`);
    }
    try {
      await page.goto(`${base}?text=full`);
      await page.waitForFunction(() => window.render_game_to_text && JSON.parse(window.render_game_to_text()).scene === 'TapToStartScene');
      await press('Enter');
      await page.waitForFunction(() => window.game.scene.getScenes(true).some(scene => scene.player));
      await page.waitForTimeout(1000);
      const before = await state();
      if (name === 'old-completed') {
        assert.equal(before.scene, 'SilentReadScene');
        assert(!before.sceneProgress.referralDispatchCopyFound);
        await move(14, 124, 'R2'); await move(14, 124, 'R1');
        await move(72, 183); await press('Space');
        const reviewed = await state();
        assert.equal(reviewed.mode, 'explore');
        assert.equal(reviewed.objective, 'EXIT EAST - SLIP');
        await move(244, 124, 'R2'); await move(244, 124, 'E1');
      } else {
        assert.equal(before.roomTraversal.currentRoomId, 'R3');
        assert.equal(before.sceneProgress.referralDispatchCopyFound, 1);
        assert(!before.sceneProgress.referralDispatchAisleOpen);
        if (fallback) assert.equal(await page.evaluate(() => window.game.textures.exists('pack-tiles-interiors-native')), false);
        await move(128,82); await promptShot('copy-prompt','READ DISPATCH COPY');
        await move(176,82); await promptShot('crank-prompt','TURN SHELF CRANK');
        await move(208, 82); await move(208, 180); await move(128, 213, 'R1');
        assert.equal((await state()).heldItem, 'StateChat Draft Manifest');
        await move(128, 42, 'R3');
        assert(!(await state()).sceneProgress.referralDispatchAisleOpen);
        await move(128, 170);
        for (let i = 0; i < 10; i++) await press('ArrowUp');
        assert((await state()).player.y >= 163);
        await move(48,180); await promptShot('index-prompt','READ STACK INDEX');
      }
      const s = await state();
      assert.deepEqual(s.inventory, before.inventory);
      assert.equal(s.documentPoints, before.documentPoints);
      assert.deepEqual(s.documentCandidates, before.documentCandidates);
      assert.deepEqual(errors, []);
      const image = await page.evaluate(() => new Promise(resolve => window.game.renderer.snapshot(image => resolve(image.src))));
      await writeFile(`${out}/${name}-native.png`, Buffer.from(image.split(',')[1], 'base64'));
      await page.screenshot({ path: `${out}/${name}.png` });
      results.push({ name, scene: s.scene, room: s.roomTraversal?.currentRoomId, points: s.documentPoints, errors });
      console.log(results.at(-1));
    } finally { await context.close(); }
  }
} finally {
  await writeFile(`${out}/results.json`, JSON.stringify(results, null, 2));
  await browser.close();
}
