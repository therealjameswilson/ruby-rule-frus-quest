import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const out = process.env.FRUS_QA_OUT ?? '/private/tmp/frus-codex-combat-pause';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE });
try {
  // Debug-room fixture; keyboard movement sets up the encounter, touch operates menus.
  const page = await browser.newPage({ viewport: { width: 375, height: 667 }, hasTouch: true, isMobile: true, deviceScaleFactor: 3 });
  const errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  const state = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));
  const enemies = () => page.evaluate(() => window.game.scene.getScene('NaraStacksScene').redactorDrones.map(drone => ({
    position: drone.position, telegraph: drone.telegraph, health: drone.healthReadout
  })));
  const tap = async control => {
    assert(control, 'Expected a visible menu control');
    const box = await page.locator('canvas').first().boundingBox();
    await page.touchscreen.tap(box.x + control.x * box.width / 256, box.y + control.y * box.height / 240);
  };
  const shot = async name => {
    const data = await page.evaluate(() => new Promise(resolve => window.game.renderer.snapshot(image => resolve(image.src))));
    await writeFile(`${out}/${name}.png`, Buffer.from(data.split(',')[1], 'base64'));
  };
  await page.goto('http://127.0.0.1:5195/?scene=NaraStacksScene&text=full');
  await page.waitForFunction(() => window.game?.scene.isActive('NaraStacksScene'));
  await page.waitForTimeout(900);
  await page.keyboard.down('ArrowUp');
  await page.waitForTimeout(500);
  await page.keyboard.up('ArrowUp');
  await page.waitForFunction(() => window.game.scene.getScene('NaraStacksScene').redactorDrones.some(drone => drone.telegraph?.kind === 'stamp-windup'));
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).pauseMenu !== null);
  const paused = await enemies(), before = await state();
  assert(paused.some(drone => drone.telegraph?.kind === 'stamp-windup'), 'Pause must catch a live reaction window');
  assert.equal(before.playerCombat.invulnerable, false, 'Fixture must not start with a prior hit');
  await page.waitForTimeout(1800);
  assert.deepEqual(await enemies(), paused, 'Pause must preserve enemy position, health and remaining tell');
  assert.equal((await state()).reliability, before.reliability);
  await shot('pause');
  await tap((await state()).pauseMenu.controls.find(control => control.id === 'settings'));
  await page.waitForTimeout(180);
  await tap((await state()).pauseMenu.controls.find(control => control.id === 'setting-3'));
  await page.waitForFunction(() => window.game.scene.isActive('CodexScene'));
  const inGuide = await enemies();
  await page.waitForTimeout(1800);
  assert.deepEqual(await enemies(), inGuide, 'Field guide must preserve the encounter');
  assert.deepEqual(inGuide, paused, 'Opening the field guide must not spend the paused reaction window');
  assert.equal((await state()).reliability, before.reliability);
  await shot('guide-list');
  const guide = (await state()).codexView;
  const known = guide.visibleEntries.findIndex(entry => entry.unlocked);
  assert(known >= 0, 'Encounter should unlock a readable enemy entry');
  await tap(guide.controls.find(control => control.id === `entry-${known}`));
  await page.waitForTimeout(250);
  assert.equal((await state()).codexView.view, 'detail');
  await shot('guide-detail');
  await tap((await state()).codexView.controls.find(control => control.id === 'close'));
  await page.waitForFunction(() => !window.game.scene.isActive('CodexScene'));
  const resumed = await state();
  assert.equal(resumed.scene, 'NaraStacksScene');
  assert.equal(resumed.mode, 'explore');
  assert.equal(resumed.reliability, before.reliability, 'Closing the guide must not land an expired attack');
  assert.equal(resumed.playerCombat.invulnerable, false, 'Closing the guide must not cause knockback');
  assert.equal(resumed.playerCombat.weapon.swingId, before.playerCombat.weapon.swingId, 'Close tap must not swing');
  const resumedEnemies = await enemies();
  assert(resumedEnemies.some(drone => drone.telegraph?.kind === 'stamp-windup'), 'Remaining reaction window must survive guide close');
  const target = resumedEnemies.find(drone => drone.telegraph?.kind === 'stamp-windup').telegraph.target;
  const direction = resumed.player.y < target.y ? 'ArrowUp' : 'ArrowDown';
  await page.keyboard.down(direction);
  await page.waitForTimeout(250);
  await page.keyboard.up(direction);
  const afterMove = await state();
  assert.equal(afterMove.playerCombat.invulnerable, false, 'The movement burst must not hide an earlier hit behind expired invulnerability');
  await page.waitForTimeout(500);
  const after = await state();
  assert(direction === 'ArrowUp' ? after.player.y < resumed.player.y : after.player.y > resumed.player.y, 'Movement must resume away from the stamp');
  assert.equal(after.reliability, before.reliability, 'Player must still have time to dodge the paused stamp');
  assert.equal(after.playerCombat.invulnerable, false, 'Dodge must avoid a hit, not merely preserve reliability');
  await shot('dodged');
  assert.deepEqual(errors, []);
  await writeFile(`${out}/result.json`, JSON.stringify({ paused, inGuide, resumedEnemies, beforeReliability: before.reliability,
    afterReliability: after.reliability, beforeCombat: before.playerCombat, afterMoveCombat: afterMove.playerCombat,
    afterCombat: after.playerCombat, direction, errors }, null, 2));
  console.log('PASS pause and field guide preserve live stamp window; touch close does not swing; player can dodge after resume');
} finally { await browser.close(); }
