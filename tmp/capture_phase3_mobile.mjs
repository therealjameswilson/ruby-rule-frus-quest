import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '/Users/jameswilson/.codex/skills/develop-web-game/node_modules/playwright/index.mjs';

const url = 'http://127.0.0.1:5193/?scene=GuideScene&role=compiler&name=Ruby';
const outDir = 'docs/screenshots/mobile';
const profiles = [
  ['phase3-iphone14pro-portrait.png', 393, 852, 3],
  ['phase3-iphone14pro-landscape.png', 852, 393, 3],
  ['phase3-pixel7-portrait.png', 412, 915, 2.625],
  ['phase3-pixel7-landscape.png', 915, 412, 2.625]
];
fs.mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader'] });
for (const [file, width, height, dpr] of profiles) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: dpr, isMobile: true, hasTouch: true });
  const errors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', (err) => errors.push(String(err)));
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(outDir, file), fullPage: false });
  const metrics = await page.evaluate(() => window.rubyRuleMobileMetrics ? ({
    css: [window.rubyRuleMobileMetrics.canvasCssWidth, window.rubyRuleMobileMetrics.canvasCssHeight],
    buffer: [window.rubyRuleMobileMetrics.canvasBackingWidth, window.rubyRuleMobileMetrics.canvasBackingHeight],
    zoom: window.rubyRuleMobileMetrics.computedZoom,
    target: window.rubyRuleMobileMetrics.integerZoomTarget,
    integer: window.rubyRuleMobileMetrics.integerZoom,
    pointers: window.rubyRuleMobileMetrics.activePointerCount
  }) : null);
  fs.writeFileSync(path.join(outDir, file.replace('.png', '.json')), JSON.stringify({ url, width, height, dpr, metrics, errors }, null, 2));
  await page.close();
}
await browser.close();
