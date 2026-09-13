import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const out = process.env.FRUS_QA_OUT || "/tmp/frus-nara-retreat";
const base = process.env.FRUS_QA_URL || "http://127.0.0.1:5195/";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(String(error)));
  const state = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));
  const shot = async name => {
    const image = await page.evaluate(() => new Promise(resolve => window.game.renderer.snapshot(image => resolve(image.src))));
    await writeFile(`${out}/${name}.png`, Buffer.from(image.split(",")[1], "base64"));
  };
  const waitScene = async scene => {
    await page.waitForFunction(scene => JSON.parse(window.render_game_to_text()).scene === scene, scene);
    await page.waitForTimeout(400);
  };
  await page.goto(`${base}?scene=WorldMapScene&region=europe`);
  await page.waitForFunction(() => window.game?.scene.isActive("WorldMapScene"));
  await page.waitForTimeout(450);
  await page.keyboard.press("ArrowDown", { delay: 50 });
  await page.waitForTimeout(80);
  await page.keyboard.press("ArrowDown", { delay: 50 });
  await page.waitForTimeout(150);
  const hint = await page.evaluate(() => window.game.scene.getScene("WorldMapScene").routePreview.list.find(object => object.name === "nara-route-preparation")?.text);
  assert.equal(hint, "FOR COMBAT: BRING FOLDER + STAMP");
  await shot("preview");
  const initial = await state();
  await page.keyboard.press("Space", { delay: 50 });
  await waitScene("GameplayMapScene");
  assert.deepEqual((await state()).inventory, []);
  await shot("arrival");
  // Read live geometry, then walk using input only. No position or save edits.
  for (let i = 0; i < 60; i++) {
    if ((await state()).nearestInteractable === "Freight Elevator Exit") break;
    const { player, door } = await page.evaluate(() => {
      const scene = window.game.scene.getScene("GameplayMapScene");
      const door = scene.doors.find(door => door.id === "world_exit");
      return { player: { x: scene.player.logicalX, y: scene.player.logicalY }, door: { x: door.x, y: door.y, radius: door.radius } };
    });
    const dy = door.y - door.radius + 2 - player.y;
    const dx = door.x - player.x;
    const vertical = Math.abs(dy) > 2;
    const key = vertical ? dy > 0 ? "ArrowDown" : "ArrowUp" : dx > 0 ? "ArrowRight" : "ArrowLeft";
    await page.keyboard.down(key);
    await page.waitForTimeout(Math.min(80, Math.max(20, Math.abs(vertical ? dy : dx) / 72 * 1000)));
    await page.keyboard.up(key);
    await page.waitForTimeout(40);
  }
  assert.equal((await state()).nearestInteractable, "Freight Elevator Exit");
  await shot("retreat");
  await page.keyboard.press("Space", { delay: 50 });
  await waitScene("WorldMapScene");
  await shot("returned");
  const returned = await state();
  assert.equal(returned.documentPoints, initial.documentPoints);
  assert.deepEqual(returned.inventory, initial.inventory);
  assert.deepEqual(returned.processStamps, initial.processStamps);
  // Scene reuse retains selection; inspect it rather than assuming a reset.
  for (let i = 0; i < 8; i++) {
    if (await page.evaluate(() => window.game.scene.getScene("WorldMapScene").selectedDistrictNumber === 3)) break;
    await page.keyboard.press("ArrowDown", { delay: 50 });
    await page.waitForTimeout(100);
  }
  await page.keyboard.press("Space", { delay: 50 });
  await waitScene("GameplayMapScene");
  const reentry = await state();
  assert.equal(reentry.danneCombat.activeEnemyCount, 1);
  assert.equal(reentry.danneCombat.roomClear.cleared, false);
  assert.deepEqual(reentry.inventory, []);
  await page.keyboard.down("ArrowDown");
  await page.waitForTimeout(100);
  await page.keyboard.up("ArrowDown");
  assert((await state()).player.y > reentry.player.y, "Re-entered scene must accept movement, not merely render");
  assert.deepEqual(errors, []);
  await writeFile(`${out}/reentry.json`, JSON.stringify(reentry, null, 2));
  await shot("reentry");
  console.log("PASS: missing-tool preview, unarmed retreat, unchanged rewards, and uncleared patrol on re-entry.");
} finally {
  await browser.close();
}
