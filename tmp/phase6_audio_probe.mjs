import fs from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const { chromium, devices } = require("/Users/jameswilson/.codex/skills/develop-web-game/node_modules/playwright");

const outDir = path.resolve("docs/screenshots/mobile");
const rawVideoDir = path.join(outDir, "phase6-video-raw");
await fs.mkdir(outDir, { recursive: true });
await fs.rm(rawVideoDir, { recursive: true, force: true });
await fs.mkdir(rawVideoDir, { recursive: true });

const errors = [];
const browser = await chromium.launch({ headless: true });

async function getCanvasCenter(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector("#game-shell canvas:not(#pixel-proof-overlay)") ?? document.querySelector("canvas");
    const rect = canvas.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  });
}

async function readState(page) {
  return page.evaluate(() => {
    const text = typeof window.render_game_to_text === "function"
      ? JSON.parse(window.render_game_to_text())
      : null;
    return {
      text,
      audio: typeof window.rubyRuleAudioDebug === "function" ? window.rubyRuleAudioDebug() : null,
      mobile: window.rubyRuleMobileMetrics ?? null
    };
  });
}

async function setVisibility(page, hidden) {
  await page.evaluate((nextHidden) => {
    Object.defineProperty(document, "hidden", { configurable: true, value: nextHidden });
    Object.defineProperty(document, "visibilityState", { configurable: true, value: nextHidden ? "hidden" : "visible" });
    document.dispatchEvent(new Event("visibilitychange"));
  }, hidden);
}

const context = await browser.newContext({
  viewport: { width: 768, height: 720 },
  recordVideo: { dir: rawVideoDir, size: { width: 768, height: 720 } }
});
const page = await context.newPage();
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push({ type: "console", message: msg.text() });
});
page.on("pageerror", (error) => errors.push({ type: "pageerror", message: error.message }));

await page.goto("http://127.0.0.1:5194/");
await page.waitForFunction(() => typeof window.rubyRuleAudioDebug === "function");
await page.waitForTimeout(300);
const beforeTap = await readState(page);
await page.screenshot({ path: path.join(outDir, "phase6-audio-before-tap.png") });

let center = await getCanvasCenter(page);
await page.mouse.click(center.x, center.y);
await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).scene === "TitleScene");
await page.waitForTimeout(700);
const afterTap = await readState(page);
await page.screenshot({ path: path.join(outDir, "phase6-audio-after-tap-title.png") });

center = await getCanvasCenter(page);
await page.mouse.click(center.x, center.y);
await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).scene === "CharacterCreateScene");
await page.waitForTimeout(900);
const afterSameThemeTransition = await readState(page);
await page.screenshot({ path: path.join(outDir, "phase6-audio-same-theme-transition.png") });

await setVisibility(page, true);
await page.waitForTimeout(220);
const afterHidden = await readState(page);

await setVisibility(page, false);
await page.waitForTimeout(650);
const afterVisible = await readState(page);
await page.screenshot({ path: path.join(outDir, "phase6-audio-after-visibility-resume.png") });

await context.close();
const videoFiles = await fs.readdir(rawVideoDir);
const rawVideo = videoFiles.find((file) => file.endsWith(".webm"));
if (rawVideo) {
  await fs.copyFile(path.join(rawVideoDir, rawVideo), path.join(outDir, "phase6-audio-recording.webm"));
}

const matrix = [];
const deviceProfiles = [
  ["iphone14pro-portrait", devices["iPhone 14 Pro"], { width: 393, height: 660 }],
  ["iphone14pro-landscape", devices["iPhone 14 Pro landscape"], { width: 734, height: 343 }],
  ["pixel7-portrait", devices["Pixel 7"], { width: 412, height: 839 }],
  ["pixel7-landscape", devices["Pixel 7 landscape"], { width: 863, height: 360 }]
];

for (const [name, baseDevice, viewport] of deviceProfiles) {
  const deviceContext = await browser.newContext({
    ...baseDevice,
    viewport
  });
  const devicePage = await deviceContext.newPage();
  const deviceErrors = [];
  devicePage.on("console", (msg) => {
    if (msg.type() === "error") deviceErrors.push(msg.text());
  });
  devicePage.on("pageerror", (error) => deviceErrors.push(error.message));
  await devicePage.goto("http://127.0.0.1:5194/");
  await devicePage.waitForFunction(() => typeof window.rubyRuleAudioDebug === "function");
  const tapPoint = await getCanvasCenter(devicePage);
  await devicePage.mouse.click(tapPoint.x, tapPoint.y);
  await devicePage.waitForFunction(() => JSON.parse(window.render_game_to_text()).scene === "TitleScene");
  await devicePage.waitForTimeout(450);
  const snapshot = await readState(devicePage);
  const screenshot = path.join(outDir, `phase6-audio-${name}.png`);
  await devicePage.screenshot({ path: screenshot });
  matrix.push({
    name,
    viewport,
    scene: snapshot.text?.scene,
    audioStatus: snapshot.text?.audioStatus,
    audio: snapshot.audio,
    integerZoom: snapshot.mobile?.integerZoom,
    computedZoom: snapshot.mobile?.computedZoom,
    errors: deviceErrors,
    screenshot
  });
  await deviceContext.close();
}

await browser.close();

const result = {
  beforeTap,
  afterTap,
  afterSameThemeTransition,
  afterHidden,
  afterVisible,
  matrix,
  errors,
  videoPath: "docs/screenshots/mobile/phase6-audio-recording.webm"
};
await fs.writeFile(path.join(outDir, "phase6-audio-probe.json"), `${JSON.stringify(result, null, 2)}\n`);
await fs.writeFile(path.join(outDir, "phase6-audio-device-matrix.json"), `${JSON.stringify(matrix, null, 2)}\n`);
console.log(JSON.stringify({
  afterTap: {
    scene: afterTap.text?.scene,
    audioStatus: afterTap.text?.audioStatus,
    audio: afterTap.audio
  },
  afterSameThemeTransition: {
    scene: afterSameThemeTransition.text?.scene,
    audioStatus: afterSameThemeTransition.text?.audioStatus,
    audio: afterSameThemeTransition.audio
  },
  afterHidden: afterHidden.audio,
  afterVisible: afterVisible.audio,
  matrix: matrix.map((entry) => ({
    name: entry.name,
    scene: entry.scene,
    audioStatus: entry.audioStatus,
    musicTimerActive: entry.audio?.musicTimerActive,
    integerZoom: entry.integerZoom,
    errors: entry.errors.length
  })),
  errors
}, null, 2));
