import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const BUNDLED_PLAYWRIGHT = "/Users/jameswilson/.codex/skills/develop-web-game/node_modules/playwright/index.mjs";

function normalizePlaywright(moduleNamespace) {
  if (moduleNamespace.chromium) return moduleNamespace;
  if (moduleNamespace.default?.chromium) return moduleNamespace.default;
  return moduleNamespace;
}

async function loadPlaywright() {
  try {
    return normalizePlaywright(await import("playwright"));
  } catch {
    return normalizePlaywright(await import(pathToFileURL(BUNDLED_PLAYWRIGHT).href));
  }
}

function getArg(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return fallback;
  return process.argv[index + 1] ?? fallback;
}

function numberArg(name, fallback) {
  const value = Number(getArg(name, String(fallback)));
  return Number.isFinite(value) ? value : fallback;
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

const url = getArg("url", "http://127.0.0.1:5173/?fps=1");
const seconds = numberArg("seconds", 60);
const warmupMs = numberArg("warmup-ms", 1000);
const outPath = getArg("out", "tools/perf_profile_report.json");
const screenshotPath = getArg("screenshot", "");
const cpuProfilePath = getArg("cpu-profile", "");
const channel = getArg("channel", "");
const angle = getArg("angle", "");
const mobile = process.argv.includes("--mobile");
const walk = process.argv.includes("--walk");
const reducedMotion = process.argv.includes("--reduced-motion");
const cpuThrottle = Math.max(1, numberArg("cpu-throttle", 1));

const { chromium } = await loadPlaywright();
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE,
  ...(channel ? { channel } : {}), ...(angle ? { args: [`--use-angle=${angle}`] } : {}) });
try {
const page = await browser.newPage({
  viewport: mobile ? { width: 375, height: 667 } : { width: 1280, height: 720 },
  deviceScaleFactor: mobile ? 3 : 2,
  hasTouch: mobile,
  isMobile: mobile
});
if (reducedMotion) await page.emulateMedia({ reducedMotion: "reduce" });
const cdp = await page.context().newCDPSession(page);
await cdp.send("Emulation.setCPUThrottlingRate", { rate: cpuThrottle });

const consoleMessages = [];
const pageErrors = [];
page.on("console", (message) => {
  if (message.type() === "error" || message.type() === "warning") {
    consoleMessages.push({ type: message.type(), text: message.text() });
  }
});
page.on("pageerror", (error) => pageErrors.push(error.message));

await page.goto(url, { waitUntil: "networkidle" });
await page.waitForFunction(() => Boolean(window.rubyRuleMobileMetrics), null, { timeout: 15000 });
await page.mouse.click(64, 64);
await page.waitForTimeout(warmupMs);
const rendererInfo = await page.evaluate(() => {
  const gl = window.game?.renderer?.gl;
  if (!gl) return { api: 'canvas', userAgent: navigator.userAgent };
  const debug = gl.getExtension('WEBGL_debug_renderer_info');
  const renderer = debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
  return {
    api: 'webgl', renderer,
    softwareRenderer: /swiftshader|llvmpipe|software rasterizer/i.test(renderer),
    backingWidth: gl.drawingBufferWidth, backingHeight: gl.drawingBufferHeight,
    userAgent: navigator.userAgent
  };
});
await page.evaluate(() => window.rubyRuleResetPerformanceMetrics?.());
await page.waitForTimeout(100);
// Observe actual game steps: the diagnostic HUD's separate RAF and coarse
// percentile buckets are not a substitute for game-loop frame pacing.
await page.evaluate(() => {
  window.__profileSteps = [];
  let previous;
  const observe = () => {
    const now = performance.now();
    if (previous !== undefined) window.__profileSteps.push(now - previous);
    previous = now;
  };
  window.game.events.on('step', observe);
  window.__stopProfileSteps = () => window.game.events.off('step', observe);
});

const startedAt = Date.now();
if (cpuProfilePath) {
  await cdp.send('Profiler.enable');
  await cdp.send('Profiler.start');
}
const samples = [];
let walkingKey = null;
let previousLeg = -1;
while (Date.now() - startedAt < seconds * 1000) {
  if (walk) {
    const leg = Math.floor((Date.now() - startedAt) / 1000);
    if (leg !== previousLeg) {
      const right = leg % 2 === 0;
      if (mobile) {
        const box = await page.locator('canvas').first().boundingBox();
        const point = x => ({ x: box.x + x * box.width / 256, y: box.y + 202 * box.height / 240, id: 1 });
        if (previousLeg < 0) await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point(48)] });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [point(right ? 74 : 22)] });
      } else {
        if (walkingKey) await page.keyboard.up(walkingKey);
        walkingKey = right ? 'ArrowRight' : 'ArrowLeft';
        await page.keyboard.down(walkingKey);
      }
      previousLeg = leg;
    }
  }
  const metrics = await page.evaluate(() => window.rubyRuleMobileMetrics);
  const gameplay = await page.evaluate(() => {
    const state = window.render_game_to_text ? JSON.parse(window.render_game_to_text()) : null;
    return state ? { scene: state.scene, mode: state.mode, player: state.player, reliability: state.reliability, gameFrame: window.game?.loop.frame,
      threats: state.visibleThreats?.length ?? 0 } : null;
  });
  samples.push({ elapsedMs: Date.now() - startedAt, metrics, gameplay });
  await page.waitForTimeout(250);
}
if (walk && mobile) await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
if (walkingKey) await page.keyboard.up(walkingKey);
if (cpuProfilePath) {
  const { profile } = await cdp.send('Profiler.stop');
  await fs.mkdir(path.dirname(cpuProfilePath), { recursive: true });
  await fs.writeFile(cpuProfilePath, JSON.stringify(profile));
}

const finalMetrics = await page.evaluate(() => window.rubyRuleMobileMetrics);
const gameFrameIntervals = await page.evaluate(() => {
  window.__stopProfileSteps();
  return window.__profileSteps;
});
const sortedIntervals = [...gameFrameIntervals].sort((a, b) => a - b);
const percentile = p => sortedIntervals.length
  ? sortedIntervals[Math.max(0, Math.ceil(sortedIntervals.length * p) - 1)] : null;
if (screenshotPath) {
  await fs.mkdir(path.dirname(screenshotPath), { recursive: true });
  await page.screenshot({ path: screenshotPath, fullPage: true });
}

const fpsValues = samples
  .map((sample) => sample.metrics?.fpsAvg1s || sample.metrics?.fpsCurrent || 0)
  .filter((value) => Number.isFinite(value) && value > 0);
const frameP99Values = samples
  .map((sample) => sample.metrics?.frameMsP99 || 0)
  .filter((value) => Number.isFinite(value) && value > 0);
const latencyValues = samples
  .map((sample) => sample.metrics?.lastInputLatencyMs)
  .filter((value) => Number.isFinite(value));
const movingSamples = samples.filter((sample, index) => index > 0 && sample.gameplay?.player && samples[index - 1].gameplay?.player
  && (sample.gameplay.player.x !== samples[index - 1].gameplay.player.x || sample.gameplay.player.y !== samples[index - 1].gameplay.player.y)).length;
const movementCoverage = samples.length > 1 ? movingSamples / (samples.length - 1) : 0;

const report = {
  url,
  seconds,
  warmupMs,
  mobile,
  walk,
  cpuThrottle,
  reducedMotion,
  browserChannel: channel || 'bundled-chromium',
  requestedAngle: angle || null,
  rendererInfo,
  generatedAt: new Date().toISOString(),
  summary: {
    measuredGameFrames: gameFrameIntervals.length,
    gameFrameP50Ms: percentile(.5),
    gameFrameP95Ms: percentile(.95),
    gameFrameP99Ms: percentile(.99),
    gameFrameMaxMs: sortedIntervals.at(-1) ?? null,
    gameFramesOver33Ms: gameFrameIntervals.filter(ms => ms > 33.4).length,
    gameFramesOver50Ms: gameFrameIntervals.filter(ms => ms > 50).length,
    sampleCount: samples.length,
    gameLoopFps: samples.length > 1 && Number.isFinite(samples.at(-1).gameplay?.gameFrame) && Number.isFinite(samples[0].gameplay?.gameFrame)
      ? (samples.at(-1).gameplay.gameFrame - samples[0].gameplay.gameFrame) * 1000 / (samples.at(-1).elapsedMs - samples[0].elapsedMs) : null,
    maxReportedThreats: Math.max(0, ...samples.map(sample => sample.gameplay?.threats ?? 0)),
    movingSamples,
    movementCoverage,
    movementRunValid: walk ? movementCoverage >= .5 : null,
    gameplayModes: [...new Set(samples.map(sample => sample.gameplay?.mode))],
    avgFps: average(fpsValues),
    minFps: fpsValues.length ? Math.min(...fpsValues) : 0,
    maxSampledFrameP99Ms: frameP99Values.length ? Math.max(...frameP99Values) : 0,
    finalFrameP99Ms: finalMetrics?.frameMsP99 ?? 0,
    finalFrameMaxMs: finalMetrics?.frameMsMax10s ?? 0,
    lastInputLatencyMs: latencyValues.length ? latencyValues.at(-1) : null,
    consoleWarningsOrErrors: consoleMessages.length,
    pageErrors: pageErrors.length
  },
  finalMetrics,
  consoleMessages,
  pageErrors,
  gameFrameIntervals,
  samples
};

await fs.mkdir(path.dirname(outPath), { recursive: true });
await fs.writeFile(outPath, `${JSON.stringify(report, null, 2)}\n`);

console.log(`Wrote ${outPath}`);
console.log(JSON.stringify(report.summary, null, 2));
} finally { await browser.close(); }
