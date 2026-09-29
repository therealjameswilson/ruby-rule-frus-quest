import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const base = process.env.FRUS_QA_URL ?? 'http://127.0.0.1:5229/';
const out = process.env.FRUS_QA_OUT ?? '/tmp/frus-demand-supporting';
await mkdir(out, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 375, height: 667 }, hasTouch: true, isMobile: true });
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
const excluded = ['hac-v2.webp', 'bees-v2.webp', 'mice-v2.webp', 'shutdown-v2.webp'];
const rows = [];
try {
  await page.goto(base);
  await page.waitForFunction(() => window.game?.scene.isActive('WarningScene'));
  const startup = await page.evaluate(() => ({
    bytes: performance.getEntriesByType('resource').reduce((n, r) => n + r.encodedBodySize, 0),
    resources: performance.getEntriesByType('resource').map(r => new URL(r.name).pathname),
    scene: JSON.parse(window.render_game_to_text()).scene
  }));
  assert(!startup.resources.some(path => excluded.some(name => path.endsWith(name))));
  assert.equal(await page.evaluate(() => window.game.textures.exists('snes-hac-member')), false);
  await page.screenshot({ path: `${out}/opening.png` });
  for (const map of ['historian_office', 'west_wing']) {
    await page.goto(new URL(`?scene=GameplayMapScene&map=${map}`, base).href);
    await page.waitForFunction(() => window.game?.scene.isActive('GameplayMapScene'));
    await page.waitForTimeout(600);
    const inspect = () => page.evaluate(() => {
      const scene = window.game.scene.getScene('GameplayMapScene');
      const t = scene.textures.get('snes-hac-member');
      return { width: t.getSourceImage().width, height: t.getSourceImage().height,
        actors: scene.children.list.filter(o => o.name === 'map-detailed-npc').map(o => ({ key: o.texture.key, frame: o.frame.name })),
        requests: performance.getEntriesByType('resource').filter(r => r.name.endsWith('hac-v2.webp')).length };
    });
    const first = await inspect();
    assert(first.width > 32 && first.height > 32, 'Detailed artwork must replace the old placeholder');
    assert.equal(first.requests, 1);
    await page.screenshot({ path: `${out}/${map}.png` });
    const expected = map === 'historian_office' ? 'snes-hac-member' : 'marine-guard-detailed-v2';
    assert(first.actors.some(a => a.key === expected), 'Room must retain its detailed NPC');
    await page.screenshot({ path: `${out}/${map}.png` });
    // Lifecycle fixture: revisit the same map, with its real loader and texture cache.
    await page.evaluate(mapKey => window.game.scene.getScene('GameplayMapScene').scene.restart({ mapKey }), map);
    await page.waitForTimeout(700);
    const revisit = await inspect();
    assert.equal(revisit.requests, 1, 'Cached room artwork must not download again');
    assert.deepEqual(revisit.actors, first.actors);
    rows.push({ map, first, revisit });
  }
  assert.deepEqual(errors, []);
  await writeFile(`${out}/result.json`, JSON.stringify({ scope: 'Fresh startup and direct-entry/revisit fixtures, not earned progression', startup, maps: rows, errors }, null, 2));
  console.log(JSON.stringify({ bytes: startup.bytes, maps: rows, errors }));
} finally { await browser.close(); }
