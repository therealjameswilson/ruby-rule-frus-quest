import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const out = process.env.FRUS_QA_OUT ?? '/private/tmp/frus-danne-demand-loading';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE });
try {
  const results = [];
  for (const sceneKey of ['TitleScene', 'OfficeScene', 'CherryBlossomGardenScene', 'BlackVaultLairScene',
    'SenateHearingChamberScene', 'NaraStacksScene', 'EmbassyCableRoomScene', 'DanneGallery']) {
    const context = await browser.newContext();
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(String(error)));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.addInitScript(() => performance.setResourceTimingBufferSize(10000));
    await page.goto(`http://127.0.0.1:5195/?scene=${sceneKey}`);
    await page.waitForFunction(key => window.game?.scene.isActive(key), sceneKey);
    await page.waitForTimeout(250);
    const result = await page.evaluate(async () => {
      const { DANNE_MAP_ASSETS, DANNE_SPRITE_ASSETS, DANNE_RUNTIME_SPRITE_ASSETS } = await import('/src/game/danneAtlas.ts');
      const textures = window.game.textures;
      const check = assets => assets.map(asset => ({ key: asset.key, sceneKey: asset.sceneKey,
        exists: textures.exists(asset.key), frames: textures.exists(asset.key) ? textures.get(asset.key).getFrameNames().length : 0 }));
      return { maps: check(DANNE_MAP_ASSETS), originals: check(DANNE_SPRITE_ASSETS), runtime: check(DANNE_RUNTIME_SPRITE_ASSETS),
        assetBytes: performance.getEntriesByType('resource').filter(entry => new URL(entry.name).pathname.startsWith('/assets/'))
          .reduce((bytes, entry) => bytes + entry.encodedBodySize, 0) };
    });
    for (const map of result.maps) assert.equal(map.exists, sceneKey === 'DanneGallery' || map.sceneKey === sceneKey, `${sceneKey}: ${map.key}`);
    for (const original of result.originals) assert.equal(original.exists, sceneKey === 'DanneGallery', `${sceneKey}: original only belongs in gallery`);
    for (const runtime of result.runtime) assert(runtime.exists && runtime.frames >= 16, `${sceneKey}: live actor frames must remain available`);
    assert.deepEqual(errors, [], sceneKey);
    const data = await page.evaluate(() => new Promise(resolve => window.game.renderer.snapshot(image => resolve(image.src))));
    await writeFile(`${out}/${sceneKey}.png`, Buffer.from(data.split(',')[1], 'base64'));
    results.push({ sceneKey, ...result, errors });
    await context.close();
  }
  await writeFile(`${out}/result.json`, JSON.stringify(results, null, 2));
  console.log('PASS title/office omit map paintings and original sheets; five rooms load only their painting; gallery retains all originals; live actor frames remain available');
} finally { await browser.close(); }
