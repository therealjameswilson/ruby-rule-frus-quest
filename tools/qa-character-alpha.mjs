import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { transform } from 'esbuild';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const helper = await transform(await readFile(new URL('../src/art/characterPixels.ts', import.meta.url), 'utf8'),
  { loader: 'ts', format: 'iife', globalName: 'CharacterPixelQA' });
const browser = await chromium.launch({ channel: 'chrome', args: ['--use-angle=metal'] });
try {
  const page = await browser.newPage(); const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(new URL('?scene=ResearchWorldScene', process.env.FRUS_QA_URL ?? 'http://127.0.0.1:5211/').href);
  await page.waitForFunction(() => window.game?.scene.isActive('ResearchWorldScene'));
  await page.addScriptTag({ content: helper.code });
  const results = await page.evaluate(() => {
    const manager = window.game.textures;
    const keys = manager.getTextureKeys().filter(key => key === 'compiler' || /^compiler_.*_hd$/.test(key) || key === 'compiler_hd');
    return keys.map(key => {
      let fallbacks = 0, differences = 0, reads = 0;
      const density = key.endsWith('_hd') ? 3 : 1;
      const original = CanvasRenderingContext2D.prototype.getImageData;
      CanvasRenderingContext2D.prototype.getImageData = function(...args) { reads++; return original.apply(this, args); };
      const sampler = CharacterPixelQA.characterAlphaSampler(manager.get(key), density, () => { fallbacks++; return null; });
      const batched = [];
      const start = performance.now();
      for (let frame = 0; frame < 12; frame++) for (let y = 0; y < 48; y++) for (let x = 0; x < 32; x++) batched.push(sampler(frame, x, y));
      const batchMs = performance.now() - start;
      CanvasRenderingContext2D.prototype.getImageData = original;
      let i = 0; const legacyStart = performance.now();
      for (let frame = 0; frame < 12; frame++) for (let y = 0; y < 48; y++) for (let x = 0; x < 32; x++) {
        if (batched[i++] !== manager.getPixelAlpha(x * density, y * density, key, frame)) differences++;
      }
      return { key, reads, fallbacks, differences, samples: i, batchMs, legacyMs: performance.now() - legacyStart };
    });
  });
  assert(results.length >= 7, 'Classic plus all six HD compiler sheets must be checked');
  for (const r of results) { assert.equal(r.reads, 1); assert.equal(r.fallbacks, 0); assert.equal(r.differences, 0); }
  assert.deepEqual(errors, []);
  await page.screenshot({ path: '/tmp/character-alpha.png' });
  await writeFile('/tmp/character-alpha.json', JSON.stringify({ results, errors }, null, 2));
  console.log(JSON.stringify({ results, errors }));
} finally { await browser.close(); }
