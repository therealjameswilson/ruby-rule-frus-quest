import fs from 'node:fs';
import path from 'node:path';
import { chromium, devices } from '/Users/jameswilson/.codex/skills/develop-web-game/node_modules/playwright/index.mjs';

const outDir = 'docs/screenshots/mobile';
fs.mkdirSync(outDir, { recursive: true });

const scenarios = [
  { name: 'iphone14pro-portrait', device: 'iPhone 14 Pro' },
  { name: 'iphone14pro-landscape', device: 'iPhone 14 Pro landscape' },
  { name: 'pixel7-portrait', device: 'Pixel 7' },
  { name: 'pixel7-landscape', device: 'Pixel 7 landscape' },
];

const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader'] });
const results = [];

async function waitForScene(page, sceneName) {
  await page.waitForFunction((expected) => {
    try {
      return JSON.parse(window.render_game_to_text?.() ?? '{}').scene === expected;
    } catch {
      return false;
    }
  }, sceneName, { timeout: 5000 });
}

for (const scenario of scenarios) {
  const descriptor = devices[scenario.device];
  const context = await browser.newContext({
    ...descriptor,
    viewport: descriptor.viewport,
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  const errors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', (err) => errors.push(String(err)));
  await page.goto('http://127.0.0.1:5194/?scene=GuideScene&role=compiler&name=Ruby', { waitUntil: 'domcontentloaded' });
  await waitForScene(page, 'GuideScene');
  await page.waitForTimeout(250);
  const screenshot = path.join(outDir, `phase5-${scenario.name}.png`);
  await page.screenshot({ path: screenshot, fullPage: false });
  const metrics = await page.evaluate(() => window.rubyRuleMobileMetrics ?? null);
  const state = await page.evaluate(() => JSON.parse(window.render_game_to_text?.() ?? '{}'));
  results.push({
    name: scenario.name,
    viewport: page.viewportSize(),
    scene: state.scene,
    mode: state.mode,
    dialog: state.dialog?.text ?? null,
    integerZoom: metrics?.integerZoom,
    computedZoom: metrics?.computedZoom,
    errors,
    screenshot,
  });
  await context.close();
}

await browser.close();
fs.writeFileSync(path.join(outDir, 'phase5-device-matrix.json'), JSON.stringify(results, null, 2));
