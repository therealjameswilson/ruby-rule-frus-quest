import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright");

const base = process.env.FRUS_QA_URL ?? "http://127.0.0.1:5195/";
const out = process.env.FRUS_QA_OUT ?? "/tmp/frus-pixel-scale";
const observe = process.argv.includes("--observe");
const profiles = [
  { id: "iphone", width: 393, height: 852, dpr: 3, touch: true },
  { id: "small-iphone", width: 375, height: 667, dpr: 3, touch: true },
  { id: "pixel", width: 412, height: 915, dpr: 2.625, touch: true },
  { id: "tablet", width: 1024, height: 768, dpr: 2, touch: true },
  { id: "desktop", width: 1280, height: 960, dpr: 1, touch: false },
  { id: "desktop-125", width: 1281, height: 961, dpr: 1.25, touch: false }
];
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true,
  ...(process.env.CHROMIUM_EXECUTABLE ? { executablePath: process.env.CHROMIUM_EXECUTABLE } : {}) });
const results = [], errors = [];

async function capture(page, cdp, name) {
  await page.waitForTimeout(700);
  const geometry = await page.evaluate(() => {
    const canvas = window.game.canvas;
    const rect = canvas.getBoundingClientRect();
    const style = getComputedStyle(document.body);
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height,
      dpr: devicePixelRatio, viewportScale: visualViewport?.scale ?? 1,
      viewportWidth: innerWidth, viewportHeight: innerHeight,
      padding: { left: parseFloat(style.paddingLeft), top: parseFloat(style.paddingTop),
        right: parseFloat(style.paddingRight), bottom: parseFloat(style.paddingBottom) },
      backingWidth: canvas.width, backingHeight: canvas.height,
      smoothing: getComputedStyle(canvas).imageRendering,
      metrics: { ...window.rubyRuleMobileMetrics },
      gameWidth: window.game.scale.width, gameHeight: window.game.scale.height,
      overflow: document.documentElement.scrollWidth > innerWidth };
  });
  // Keep emulation and screenshot capture in the same CDP session. A separate
  // session can capture at its own density instead of the page's current DPR.
  const capture = await cdp.send("Page.captureScreenshot", { format: "png", fromSurface: true, captureBeyondViewport: false,
    clip: { x: 0, y: 0, width: geometry.viewportWidth, height: geometry.viewportHeight, scale: 1 } });
  const screenshot = Buffer.from(capture.data, "base64");
  await writeFile(`${out}/${name}.png`, screenshot);
  const native = await page.evaluate(() => new Promise(resolve => window.game.renderer.snapshot(image => resolve(image.src))));
  await writeFile(`${out}/${name}-native.png`, Buffer.from(native.split(",")[1], "base64"));
  const pixels = await page.evaluate(async ({ imageUrl, native, geometry }) => {
    const image = new Image(); image.src = imageUrl; await image.decode();
    const canvas = document.createElement("canvas"); canvas.width = image.width; canvas.height = image.height;
    const context = canvas.getContext("2d"); context.drawImage(image, 0, 0);
    const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const x = geometry.x * geometry.dpr, y = geometry.y * geometry.dpr;
    const scaleX = geometry.width * geometry.dpr / 256, scaleY = geometry.height * geometry.dpr / 240;
    const sample = (column, offset) => {
      const runs = [];
      const start = Math.round(column ? y : x), end = Math.round(column ? y + 16 * scaleY : x + 16 * scaleX);
      for (let position = start; position < end; position++) {
        const px = column ? Math.floor(x + (offset + 0.5) * scaleX) : position;
        const py = column ? position : Math.floor(y + (offset + 0.5) * scaleY);
        const i = (py * canvas.width + px) * 4;
        const color = `${data[i]},${data[i + 1]},${data[i + 2]}`;
        const prior = runs.at(-1);
        if (prior?.color === color) prior.length++;
        else runs.push({ color, length: 1 });
      }
      return runs;
    };
    const rows = [2, 5, 10, 14].map(offset => sample(false, offset));
    const columns = [2, 5, 10, 14].map(offset => sample(true, offset));
    const source = new Image(); source.src = native; await source.decode();
    const sourceCanvas = document.createElement("canvas"); sourceCanvas.width = 256; sourceCanvas.height = 240;
    const sourceContext = sourceCanvas.getContext("2d"); sourceContext.drawImage(source, 0, 0);
    const sourceData = sourceContext.getImageData(0, 0, 256, 240).data;
    const zoom = geometry.metrics.integerZoomTarget;
    const marks = [
      { name: "checker-and-origin-texel", x: 0, y: 0, width: 16, height: 16 },
      { name: "single-texel", x: 24, y: 174, width: 1, height: 1 },
      { name: "diagonal", x: 222, y: 170, width: 16, height: 16 }
    ].map(mark => {
      let mismatched = 0;
      for (let dy = 0; dy < mark.height * zoom; dy++) {
        for (let dx = 0; dx < mark.width * zoom; dx++) {
          const actual = ((Math.round(y) + mark.y * zoom + dy) * image.width + Math.round(x) + mark.x * zoom + dx) * 4;
          const expected = ((mark.y + Math.floor(dy / zoom)) * 256 + mark.x + Math.floor(dx / zoom)) * 4;
          if ([0, 1, 2].some(channel => data[actual + channel] !== sourceData[expected + channel])) mismatched++;
        }
      }
      return { name: mark.name, mismatched, checkedPixels: mark.width * mark.height * zoom * zoom };
    });
    return { scaleX, scaleY, originX: x, originY: y, rows, columns,
      screenshotWidth: image.width, screenshotHeight: image.height, marks };
  }, { imageUrl: `data:image/png;base64,${screenshot.toString("base64")}`, native, geometry });
  const target = geometry.metrics.integerZoomTarget;
  const epsilon = 0.06; // Browser CSS layout quantizes to 1/64 CSS px.
  const near = (a, b) => Math.abs(a - b) < epsilon;
  const checks = {
    actualDpr: geometry.metrics.dpr === geometry.dpr,
    screenshotPhysicalSize: Math.abs(pixels.screenshotWidth - geometry.viewportWidth * geometry.dpr) <= 1
      && Math.abs(pixels.screenshotHeight - geometry.viewportHeight * geometry.dpr) <= 1,
    integerWidth: near(pixels.scaleX, target), integerHeight: near(pixels.scaleY, target),
    alignedX: near(pixels.originX, Math.round(pixels.originX)),
    alignedY: near(pixels.originY, Math.round(pixels.originY)),
    nativeBuffer: geometry.backingWidth === 256 && geometry.backingHeight === 240,
    logicalSize: geometry.gameWidth === 256 && geometry.gameHeight === 240,
    inSafeArea: geometry.x >= geometry.padding.left - epsilon && geometry.y >= geometry.padding.top - epsilon
      && geometry.x + geometry.width <= geometry.viewportWidth - geometry.padding.right + epsilon
      && geometry.y + geometry.height <= geometry.viewportHeight - geometry.padding.bottom + epsilon,
    noOverflow: !geometry.overflow,
    exactNativeMarks: pixels.marks.every(mark => mark.mismatched === 0),
    uniformChecker: [...pixels.rows, ...pixels.columns].every(runs => runs.length === 16
      && runs.every(run => run.length === target)
      && new Set(runs.map(run => run.color)).size === 2)
  };
  const result = { name, geometry, pixels, checks };
  results.push(result);
  await writeFile(`${out}/${name}.json`, JSON.stringify(result, null, 2));
  console.log(name, JSON.stringify({ failedChecks: Object.entries(checks).filter(([, passed]) => !passed).map(([key]) => key),
    physicalScale: [pixels.scaleX, pixels.scaleY], dpr: geometry.dpr }));
  if (!observe) assert(Object.values(checks).every(Boolean), `${name}: pixel contract failed`);
}

try {
  const selected = profiles.filter(profile => !process.env.FRUS_QA_PROFILE || profile.id === process.env.FRUS_QA_PROFILE);
  assert(selected.length, "No matching QA profile");
  for (const profile of selected) {
    const context = await browser.newContext({ viewport: { width: profile.width, height: profile.height },
      deviceScaleFactor: profile.dpr, hasTouch: profile.touch, isMobile: profile.touch });
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    const setViewport = (width, height, dpr = profile.dpr) => cdp.send("Emulation.setDeviceMetricsOverride", {
      width, height, deviceScaleFactor: dpr, mobile: profile.touch
    });
    page.on("pageerror", error => errors.push(`${profile.id}: ${error}`));
    page.on("console", message => { if (message.type() === "error") errors.push(`${profile.id}: ${message.text()}`); });
    try {
      await setViewport(profile.width, profile.height);
      await page.goto(`${base}?scene=RenderDebugScene`);
      await page.waitForFunction(() => window.render_game_to_text
        && JSON.parse(window.render_game_to_text()).scene === "RenderDebugScene");
      await capture(page, cdp, `${profile.id}-initial`);
      await setViewport(profile.height, profile.width);
      await capture(page, cdp, `${profile.id}-rotated`);
      await setViewport(profile.width, profile.height);
      await capture(page, cdp, `${profile.id}-restored`);
      if (profile.touch) {
        await page.evaluate(() => {
          document.body.style.padding = "47px 13px 34px 29px";
          window.dispatchEvent(new Event("resize"));
        });
        await capture(page, cdp, `${profile.id}-safe-area`);
        await setViewport(profile.width, profile.height - 80);
        await capture(page, cdp, `${profile.id}-browser-chrome`);
      }
      if (profile.id === "desktop-125") {
        for (const dpr of [2.625, 1.25]) {
          await setViewport(profile.width, profile.height, dpr);
          await capture(page, cdp, `${profile.id}-density-${dpr}`);
        }
      }
    } finally { await context.close(); }
  }
  assert.deepEqual(errors, []);
} finally {
  await writeFile(`${out}/results.json`, JSON.stringify({ results, errors }, null, 2));
  await browser.close();
}
