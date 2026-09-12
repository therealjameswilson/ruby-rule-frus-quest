import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const out = process.env.FRUS_QA_OUT ?? '/private/tmp/frus-gate-captions';
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE });
await mkdir(out, { recursive: true });
try {
  for (const mobile of [false, true]) {
    const context = await browser.newContext(mobile
      ? { viewport: { width: 375, height: 667 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }
      : { viewport: { width: 1024, height: 900 } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(`${process.env.FRUS_QA_URL ?? 'http://127.0.0.1:5195/'}?scene=ArchiveScene&text=full`);
    await page.waitForFunction(() => window.game?.scene.getScene('ArchiveScene')?.scene.isActive());
    await page.waitForTimeout(2500);
    const labels = await page.evaluate(() => {
      const nodes = window.game.scene.getScene('ArchiveScene').children.list;
      return nodes.filter(o => ['snes-gate-lock-label', 'snes-gate-route-label'].includes(o.name)).map(o => {
        const b = o.getBounds();
        const frame = nodes.find(f => ['snes-gate-lock-seal', 'snes-gate-route-plaque'].includes(f.name)
          && f.getBounds().contains(b.centerX, b.centerY));
        const f = frame?.getBounds();
        return { text: o.text, x: b.x, y: b.y, right: b.right, bottom: b.bottom,
          frame: f ? { left: f.left, right: f.right, top: f.top, bottom: f.bottom } : null };
      });
    });
    assert.equal(labels.length, 4);
    for (const label of labels) {
      assert.ok(label.frame, `Missing frame: ${label.text}`);
      assert.ok(label.x >= label.frame.left + 3 && label.right <= label.frame.right - 3);
      assert.ok(label.y >= label.frame.top && label.bottom <= label.frame.bottom);
      assert.ok(label.frame.left >= 18 && label.frame.right <= 238);
      assert.ok(Number.isInteger(label.x) && Number.isInteger(label.y));
    }
    assert.deepEqual(errors, []);
    const name = mobile ? 'phone' : 'desktop';
    await page.screenshot({ path: `${out}/${name}.png` });
    const native = await page.evaluate(() => new Promise(resolve => window.game.renderer.snapshot(image => resolve(image.src))));
    await writeFile(`${out}/${name}-native.png`, Buffer.from(native.split(',')[1], 'base64'));
    await writeFile(`${out}/${name}.json`, JSON.stringify({ labels, errors }, null, 2));
    console.log(`${name}: four gate captions fit; no console errors`);
    await context.close();
  }
} finally { await browser.close(); }
