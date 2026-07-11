import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '/Users/jameswilson/.codex/skills/develop-web-game/node_modules/playwright/index.mjs';

const outDir = 'docs/screenshots/mobile';
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader'] });
const context = await browser.newContext({
  viewport: { width: 393, height: 852 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  recordVideo: { dir: path.join(outDir, 'phase5-video-raw'), size: { width: 393, height: 852 } }
});
const page = await context.newPage();
const errors = [];
page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
page.on('pageerror', (err) => errors.push(String(err)));

async function state() {
  return page.evaluate(() => JSON.parse(window.render_game_to_text?.() ?? '{}'));
}

async function waitForScene(sceneName) {
  await page.waitForFunction((expected) => {
    try {
      return JSON.parse(window.render_game_to_text?.() ?? '{}').scene === expected;
    } catch {
      return false;
    }
  }, sceneName, { timeout: 5000 });
}

async function dispatch(type, gameX, gameY, pointerId = 1) {
  await page.evaluate(({ type, gameX, gameY, pointerId }) => {
    const canvas = document.querySelector('canvas:not(#pixel-proof-overlay)');
    if (!canvas) throw new Error('No game canvas');
    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width / 256;
    const scaleY = rect.height / 240;
    const event = new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      pointerId,
      pointerType: 'touch',
      isPrimary: pointerId === 1,
      clientX: rect.left + gameX * scaleX,
      clientY: rect.top + gameY * scaleY,
      buttons: type === 'pointerup' || type === 'pointercancel' ? 0 : 1,
      button: 0
    });
    canvas.dispatchEvent(event);
  }, { type, gameX, gameY, pointerId });
}

async function tap(gameX, gameY, pointerId = 1, holdMs = 70) {
  await dispatch('pointerdown', gameX, gameY, pointerId);
  await page.waitForTimeout(holdMs);
  await dispatch('pointerup', gameX, gameY, pointerId);
  await page.waitForTimeout(160);
}

await page.goto('http://127.0.0.1:5194/?scene=GuideScene&role=compiler&name=Ruby', { waitUntil: 'domcontentloaded' });
await waitForScene('GuideScene');
await page.waitForTimeout(250);
await page.screenshot({ path: path.join(outDir, 'phase5-dialog-touch-before.png'), fullPage: false });
const beforeDialog = await state();

await tap(82, 205, 21);
const afterDialogTap = await state();
await page.screenshot({ path: path.join(outDir, 'phase5-dialog-touch-after-tap.png'), fullPage: false });

await dispatch('pointerdown', 82, 205, 22);
await page.waitForTimeout(620);
await dispatch('pointerup', 82, 205, 22);
await page.waitForTimeout(220);
const afterLongPress = await state();
await page.screenshot({ path: path.join(outDir, 'phase5-dialog-longpress-after.png'), fullPage: false });

await tap(224, 16, 23);
await page.waitForTimeout(250);
const inventoryOpenState = await state();
await page.screenshot({ path: path.join(outDir, 'phase5-inventory-open.png'), fullPage: false });

await tap(82, 53, 24); // second tool slot, expected locked or acquired depending seed
const afterToolTap = await state();
await page.screenshot({ path: path.join(outDir, 'phase5-inventory-tool-tap.png'), fullPage: false });

await tap(223, 35, 25);
const afterClose = await state();
await page.screenshot({ path: path.join(outDir, 'phase5-inventory-close.png'), fullPage: false });

await page.goto('http://127.0.0.1:5194/?scene=SilentReadScene&role=compiler&name=Ruby', { waitUntil: 'domcontentloaded' });
await waitForScene('SilentReadScene');
await page.waitForTimeout(250);
await dispatch('pointerdown', 82, 205, 31);
await page.waitForTimeout(620);
await dispatch('pointerup', 82, 205, 31);
await page.waitForTimeout(220);
await tap(224, 16, 32);
await page.waitForTimeout(250);
await tap(176, 53, 33);
await page.waitForTimeout(250);
const afterEquipTap = await state();
await page.screenshot({ path: path.join(outDir, 'phase5-inventory-equip-acquired.png'), fullPage: false });

const metrics = await page.evaluate(() => window.rubyRuleMobileMetrics ?? null);

await context.close();
const video = page.video();
let videoPath = null;
if (video) {
  const raw = await video.path();
  videoPath = path.join(outDir, 'phase5-touch-ui-recording.webm');
  fs.copyFileSync(raw, videoPath);
}
await browser.close();

fs.writeFileSync(path.join(outDir, 'phase5-touch-ui-probe.json'), JSON.stringify({
  beforeDialog: { scene: beforeDialog.scene, mode: beforeDialog.mode, dialog: beforeDialog.dialog },
  afterDialogTap: { scene: afterDialogTap.scene, mode: afterDialogTap.mode, dialog: afterDialogTap.dialog },
  afterLongPress: { scene: afterLongPress.scene, mode: afterLongPress.mode, dialog: afterLongPress.dialog, objective: afterLongPress.objective },
  inventoryOpenState: { scene: inventoryOpenState.scene, mode: inventoryOpenState.mode, latestMessage: inventoryOpenState.latestMessage, processItems: inventoryOpenState.processItems },
  afterToolTap: { scene: afterToolTap.scene, mode: afterToolTap.mode, latestMessage: afterToolTap.latestMessage, equipped: afterToolTap.processItems?.find((item) => item.equipped)?.id ?? null },
  afterClose: { scene: afterClose.scene, mode: afterClose.mode, latestMessage: afterClose.latestMessage },
  afterEquipTap: { scene: afterEquipTap.scene, mode: afterEquipTap.mode, latestMessage: afterEquipTap.latestMessage, equipped: afterEquipTap.processItems?.find((item) => item.equipped)?.id ?? null },
  metrics: metrics ? { activePointerCount: metrics.activePointerCount, lastInputLatencyMs: metrics.lastInputLatencyMs, computedZoom: metrics.computedZoom, integerZoom: metrics.integerZoom } : null,
  videoPath,
  errors
}, null, 2));
