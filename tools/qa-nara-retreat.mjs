import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const out = process.env.FRUS_QA_OUT || "/tmp/frus-nara-retreat";
const base = process.env.FRUS_QA_URL || "http://127.0.0.1:5195/";
const capitol = process.argv.includes("--capitol");
const mobile = process.argv.includes("--mobile");
const district = capitol ? 8 : 3;
const exitLabel = capitol ? "Return to World Map" : "Freight Elevator Exit";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE });
try {
  const page = await browser.newPage(mobile
    ? { viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 }
    : {});
  const cdp = await page.context().newCDPSession(page);
  const press = async (key, duration = 50) => {
    if (!mobile) return page.keyboard.press(key, { delay: duration });
    const b = await page.locator("canvas").first().boundingBox();
    const point = (x, y) => ({ x: b.x + x * b.width / 256, y: b.y + y * b.height / 240, id: 1 });
    const action = key === "Space";
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [action ? point(225, 205) : point(48, 202)] });
    if (!action) {
      const [dx, dy] = { ArrowDown: [0, 26], ArrowUp: [0, -26], ArrowLeft: [-26, 0], ArrowRight: [26, 0] }[key];
      await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [point(48 + dx, 202 + dy)] });
    }
    await page.waitForTimeout(duration);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await page.waitForTimeout(30);
  };
  const errors = [];
  page.on("pageerror", error => errors.push(String(error)));
  const state = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));
  const shot = async name => {
    const image = await page.evaluate(() => new Promise(resolve => window.game.renderer.snapshot(image => resolve(image.src))));
    await writeFile(`${out}/${name}.png`, Buffer.from(image.split(",")[1], "base64"));
    if (mobile) await page.screenshot({ path: `${out}/${name}-phone.png` });
  };
  const waitScene = async scene => {
    await page.waitForFunction(scene => JSON.parse(window.render_game_to_text()).scene === scene, scene);
    await page.waitForTimeout(400);
  };
  await page.goto(`${base}?scene=WorldMapScene&region=europe`);
  await page.waitForFunction(() => window.game?.scene.isActive("WorldMapScene"));
  await page.waitForTimeout(450);
  if (mobile) assert.equal(await page.evaluate(() => window.game.scene.getScene("UIScene").controls.buttons.find(b => b.key === "b").text.visible), false);
  for (let i = 1; i < district; i++) {
    await press("ArrowDown");
    await page.waitForTimeout(80);
  }
  await page.waitForTimeout(150);
  const hint = await page.evaluate(capitol => window.game.scene.getScene("WorldMapScene").routePreview.list.find(object => object.name === (capitol ? "capitol-route-preparation" : "nara-route-preparation"))?.text, capitol);
  assert.equal(hint, capitol ? "FOR COMBAT: BRING FOLDER" : "FOR COMBAT: BRING FOLDER + STAMP");
  await shot("preview");
  const initial = await state();
  await press("Space");
  await waitScene("GameplayMapScene");
  if (mobile) assert.equal(await page.evaluate(() => window.game.scene.getScene("UIScene").controls.buttons.find(b => b.key === "b").text.visible), true);
  assert.deepEqual((await state()).inventory, []);
  await shot("arrival");
  // Read live geometry, then walk using input only. No position or save edits.
  for (let i = 0; i < 60; i++) {
    if ((await state()).nearestInteractable === exitLabel) break;
    const { player, door } = await page.evaluate(() => {
      const scene = window.game.scene.getScene("GameplayMapScene");
      const door = scene.doors.find(door => door.id === "world_exit");
      return { player: { x: scene.player.logicalX, y: scene.player.logicalY }, door: { x: door.x, y: door.y, radius: door.radius } };
    });
    const dy = door.y - door.radius + 2 - player.y;
    const dx = door.x - player.x;
    const vertical = Math.abs(dy) > 2;
    const key = vertical ? dy > 0 ? "ArrowDown" : "ArrowUp" : dx > 0 ? "ArrowRight" : "ArrowLeft";
    await press(key, Math.min(80, Math.max(20, Math.abs(vertical ? dy : dx) / 90 * 1000)));
    await page.waitForTimeout(40);
  }
  assert.equal((await state()).nearestInteractable, exitLabel);
  await shot("retreat");
  await press("Space");
  await waitScene("WorldMapScene");
  await shot("returned");
  const returned = await state();
  assert.equal(returned.documentPoints, initial.documentPoints);
  assert.deepEqual(returned.inventory, initial.inventory);
  assert.deepEqual(returned.processStamps, initial.processStamps);
  // Scene reuse retains selection; inspect it rather than assuming a reset.
  for (let i = 0; i < 8; i++) {
    if (await page.evaluate(district => window.game.scene.getScene("WorldMapScene").selectedDistrictNumber === district, district)) break;
    await press("ArrowDown");
    await page.waitForTimeout(100);
  }
  await press("Space");
  await waitScene("GameplayMapScene");
  const reentry = await state();
  assert.equal(reentry.danneCombat.activeEnemyCount, 1);
  assert.equal(reentry.danneCombat.roomClear.cleared, false);
  assert.deepEqual(reentry.inventory, []);
  await press("ArrowDown", 100);
  assert((await state()).player.y > reentry.player.y, "Re-entered scene must accept movement, not merely render");
  assert.deepEqual(errors, []);
  await writeFile(`${out}/reentry.json`, JSON.stringify(reentry, null, 2));
  await shot("reentry");
  console.log("PASS: missing-tool preview, unarmed retreat, unchanged rewards, and uncleared patrol on re-entry.");
} finally {
  await browser.close();
}
