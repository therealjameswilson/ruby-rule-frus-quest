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

const { chromium } = await loadPlaywright();
const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1280, height: 720 },
  deviceScaleFactor: 2
});

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
await page.evaluate(() => window.rubyRuleResetPerformanceMetrics?.());
await page.waitForTimeout(100);

const startedAt = Date.now();
const samples = [];
while (Date.now() - startedAt < seconds * 1000) {
  const metrics = await page.evaluate(() => window.rubyRuleMobileMetrics);
  samples.push({ elapsedMs: Date.now() - startedAt, metrics });
  await page.waitForTimeout(250);
}

const finalMetrics = await page.evaluate(() => window.rubyRuleMobileMetrics);
if (screenshotPath) {
  await fs.mkdir(path.dirname(screenshotPath), { recursive: true });
  await page.screenshot({ path: screenshotPath, fullPage: true });
}
await browser.close();

const fpsValues = samples
  .map((sample) => sample.metrics?.fpsAvg1s || sample.metrics?.fpsCurrent || 0)
  .filter((value) => Number.isFinite(value) && value > 0);
const frameP99Values = samples
  .map((sample) => sample.metrics?.frameMsP99 || 0)
  .filter((value) => Number.isFinite(value) && value > 0);
const latencyValues = samples
  .map((sample) => sample.metrics?.lastInputLatencyMs)
  .filter((value) => Number.isFinite(value));

const report = {
  url,
  seconds,
  warmupMs,
  generatedAt: new Date().toISOString(),
  summary: {
    sampleCount: samples.length,
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
  samples
};

await fs.mkdir(path.dirname(outPath), { recursive: true });
await fs.writeFile(outPath, `${JSON.stringify(report, null, 2)}\n`);

console.log(`Wrote ${outPath}`);
console.log(JSON.stringify(report.summary, null, 2));
