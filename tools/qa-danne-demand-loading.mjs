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
      const { DANNE_ITEM_ASSETS, DANNE_BOSS_HUD_ASSET, DANNE_LETTERBOX_ASSET, DANNE_BOSS_PORTRAIT_ASSET, DANNE_MAP_ASSETS, DANNE_SPRITE_ASSETS, DANNE_RUNTIME_SPRITE_ASSETS, DANNE_VARIANT_ASSETS, DANNE_PORTRAIT_ASSETS } = await import('/src/game/danneAtlas.ts');
      const textures = window.game.textures;
      const assetRequests = performance.getEntriesByType('resource')
        .filter(entry => new URL(entry.name).pathname.startsWith('/assets/'))
        .map(entry => ({ path: new URL(entry.name).pathname, bytes: entry.encodedBodySize }))
        .sort((left, right) => right.bytes - left.bytes);
      const check = assets => assets.map(asset => ({ key: asset.key, sceneKey: asset.sceneKey,
        exists: textures.exists(asset.key), frames: textures.exists(asset.key) ? textures.get(asset.key).getFrameNames().length : 0 }));
      return { maps: check(DANNE_MAP_ASSETS), originals: check(DANNE_SPRITE_ASSETS), runtime: check(DANNE_RUNTIME_SPRITE_ASSETS),
        variants: check(DANNE_VARIANT_ASSETS), portraits: check(DANNE_PORTRAIT_ASSETS),
        items: check(DANNE_ITEM_ASSETS), shelf: textures.exists('ui_row_six'),
        bossPortrait: textures.exists(DANNE_BOSS_PORTRAIT_ASSET.key),
        bossHud: textures.exists(DANNE_BOSS_HUD_ASSET.key),
        letterbox: textures.exists(DANNE_LETTERBOX_ASSET.key),
        assetRequests,
        assetBytes: assetRequests.reduce((bytes, entry) => bytes + entry.bytes, 0) };
    });
    for (const map of result.maps) assert.equal(map.exists, sceneKey === 'DanneGallery' || map.sceneKey === sceneKey, `${sceneKey}: ${map.key}`);
    for (const original of result.originals) assert.equal(original.exists, sceneKey === 'DanneGallery', `${sceneKey}: original only belongs in gallery`);
    for (const runtime of result.runtime) assert(runtime.exists && runtime.frames >= 16, `${sceneKey}: live actor frames must remain available`);
    for (const variant of result.variants) assert.equal(variant.exists, sceneKey === 'BlackVaultLairScene' || sceneKey === 'DanneGallery');
    for (const portrait of result.portraits) assert.equal(portrait.exists, sceneKey === 'DanneGallery');
    for (const item of result.items) assert.equal(item.exists, sceneKey !== 'TitleScene' && sceneKey !== 'OfficeScene', `${sceneKey}: item cards belong to expansion maps, gallery or opened inventory`);
    assert.equal(result.shelf, false, `${sceneKey}: records shelf waits until pause is opened`);
    assert.equal(result.bossPortrait, sceneKey === 'BlackVaultLairScene' || sceneKey === 'DanneGallery', `${sceneKey}: boss portrait is room-owned`);
    assert.equal(result.bossHud, sceneKey === 'BlackVaultLairScene' || sceneKey === 'DanneGallery', `${sceneKey}: boss HUD is room-owned`);
    assert.equal(result.letterbox, sceneKey === 'BlackVaultLairScene' || sceneKey === 'DanneGallery', `${sceneKey}: cutscene bars are room-owned`);
    assert.deepEqual(errors, [], sceneKey);
    const data = await page.evaluate(() => new Promise(resolve => window.game.renderer.snapshot(image => resolve(image.src))));
    await writeFile(`${out}/${sceneKey}.png`, Buffer.from(data.split(',')[1], 'base64'));
    results.push({ sceneKey, ...result, errors });
    await context.close();
  }
  await writeFile(`${out}/result.json`, JSON.stringify(results, null, 2));
  const debugContext = await browser.newContext();
  const debugPage = await debugContext.newPage();
  const debugErrors = [];
  debugPage.on('pageerror', error => debugErrors.push(String(error)));
  debugPage.on('console', message => { if (message.type() === 'error') debugErrors.push(message.text()); });
  await debugPage.goto('http://127.0.0.1:5195/?scene=NaraStacksScene&debug=ui');
  await debugPage.waitForFunction(() => window.game?.scene.isActive('NaraStacksScene'));
  await debugPage.waitForTimeout(400);
  await debugPage.keyboard.press('x', { delay: 60 });
  await debugPage.waitForFunction(() => window.game.textures.exists('pack-danne-boss-healthbar-empty'));
  await debugPage.waitForFunction(() => window.game.textures.exists('pack-danne-letterbox-top')
    && window.game.textures.exists('pack-danne-letterbox-bottom'));
  const debugImage = await debugPage.evaluate(() => new Promise(resolve => window.game.renderer.snapshot(image => resolve(image.src))));
  await writeFile(`${out}/NaraStacksScene-ui.png`, Buffer.from(debugImage.split(',')[1], 'base64'));
  assert.deepEqual(debugErrors, []);
  await debugContext.close();
  console.log('PASS title/office omit map paintings and original sheets; five rooms load only their painting; gallery retains all originals; live actor frames remain available');
} finally { await browser.close(); }
