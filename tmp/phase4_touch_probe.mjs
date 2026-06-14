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
  recordVideo: { dir: path.join(outDir, 'phase4-video-raw'), size: { width: 393, height: 852 } }
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

async function tap(gameX, gameY, pointerId = 1) {
  await dispatch('pointerdown', gameX, gameY, pointerId);
  await page.waitForTimeout(60);
  await dispatch('pointerup', gameX, gameY, pointerId);
  await page.waitForTimeout(140);
}

await page.goto('http://127.0.0.1:5194/', { waitUntil: 'domcontentloaded' });
await waitForScene('TapToStartScene');
await page.waitForTimeout(120);
await page.screenshot({ path: path.join(outDir, 'phase4-tap-gate.png'), fullPage: false });
const gateState = await state();
await tap(128, 108);
await waitForScene('TitleScene');
await page.waitForTimeout(120);
await page.screenshot({ path: path.join(outDir, 'phase4-after-tap-title.png'), fullPage: false });
const titleState = await state();

await page.goto('http://127.0.0.1:5194/?scene=GuideScene&role=compiler&name=Ruby', { waitUntil: 'domcontentloaded' });
await waitForScene('GuideScene');
await page.waitForTimeout(180);
await page.screenshot({ path: path.join(outDir, 'phase4-touch-idle.png'), fullPage: false });
for (let i = 0; i < 3; i += 1) await tap(225, 205, 2);
await dispatch('pointerdown', 45, 170, 11);
await dispatch('pointermove', 45, 132, 11);
await page.waitForTimeout(80);
await dispatch('pointerdown', 225, 205, 12);
await page.waitForTimeout(650);
await page.screenshot({ path: path.join(outDir, 'phase4-touch-held-dpad-a.png'), fullPage: false });
const heldTouchDebug = await page.evaluate(() => window.rubyRuleTouchControls ?? null);
await dispatch('pointerup', 225, 205, 12);
await dispatch('pointerup', 45, 132, 11);
await page.waitForTimeout(250);
await page.screenshot({ path: path.join(outDir, 'phase4-touch-dpad-a.png'), fullPage: false });
const touchState = await state();
await tap(178, 215, 13); // B button
await tap(224, 16, 14); // Start button
await page.waitForTimeout(250);
const finalState = await state();
const metrics = await page.evaluate(() => window.rubyRuleMobileMetrics ?? null);

await context.close();
const video = page.video();
let videoPath = null;
if (video) {
  const raw = await video.path();
  videoPath = path.join(outDir, 'phase4-touch-recording.webm');
  fs.copyFileSync(raw, videoPath);
}
await browser.close();
fs.writeFileSync(path.join(outDir, 'phase4-touch-probe.json'), JSON.stringify({
  gateState: { scene: gateState.scene, mode: gateState.mode, objective: gateState.objective, audioStatus: gateState.audioStatus },
  titleState: { scene: titleState.scene, mode: titleState.mode, objective: titleState.objective, audioStatus: titleState.audioStatus },
  touchState: { scene: touchState.scene, mode: touchState.mode, player: touchState.player, facing: touchState.playerFacing, dialog: touchState.dialog, nearest: touchState.nearestInteractable, audioStatus: touchState.audioStatus },
  finalState: { scene: finalState.scene, mode: finalState.mode, player: finalState.player, facing: finalState.playerFacing, dialog: finalState.dialog, nearest: finalState.nearestInteractable },
  metrics: metrics ? { activePointerCount: metrics.activePointerCount, lastInputLatencyMs: metrics.lastInputLatencyMs, computedZoom: metrics.computedZoom, integerZoom: metrics.integerZoom } : null,
  heldTouchDebug,
  videoPath,
  errors
}, null, 2));
