import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { danneCombatBoastsForVariantPhase } from '../src/game/danneBoasts.ts';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const out = process.env.FRUS_QA_OUT ?? '/private/tmp/frus-danne-speech';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE });
try {
  const page = await browser.newPage({ viewport: { width: 1024, height: 960 } });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('http://127.0.0.1:5195/?scene=GameplayMapScene&map=capitol_hill&text=full');
  await page.waitForFunction(() => window.game?.scene.getScene('GameplayMapScene')?.danneEnemies?.length > 0);
  await page.waitForTimeout(1000);
  // Presentation fixtures only: do not grant enemy damage or earned progress.
  const cases = process.argv.includes('--roster')
    ? ['reveal', 'prototype', 'colossus', 'cloud', 'infiltrator', 'swarm', 'defeated', 'ascendant']
      .flatMap(phase => danneCombatBoastsForVariantPhase(phase).map((line, i) => ({ id: `${phase}-${i}`, line })))
    : [{ id: 'speech', line: 'Your painstaking source notes cannot possibly outlast my magnificent archival superiority.' }];
  const results = [];
  for (const { id, line } of cases) {
  const result = await page.evaluate(line => {
    const scene = window.game.scene.getScene('GameplayMapScene');
    const enemy = scene.danneEnemies[0];
    enemy.setCombatPaused(true);
    enemy.cancelMeleeAttack();
    enemy.setPosition(143, 126);
    enemy.showTauntBubble(line);
    enemy.syncTauntBubble(scene.player.position);
    scene.tweens.killTweensOf(enemy.tauntBubble);
    enemy.tauntBubble.setAlpha(1);
    const bubble = enemy.tauntBubble;
    const text = bubble.list.find(child => typeof child.text === 'string');
    const bounds = text.getBounds();
    return { visible: bubble.visible, x: bubble.x, y: bubble.y,
      height: enemy.tauntHeight, text: text.text,
      textBounds: { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height },
      player: scene.player.position, enemy: { x: enemy.x, y: enemy.y } };
  }, line);
  assert.equal(result.visible, true);
  assert(result.text.split('\n').length <= 2);
  assert(result.textBounds.x >= result.x);
  assert(result.textBounds.x + result.textBounds.width <= result.x + 96);
  assert(result.textBounds.y + result.textBounds.height <= result.y + result.height);
  if (process.argv.includes('--roster')) assert.equal(result.text.replace(/\s+/g, ' '), `DANN-E: ${line}`.replace(/\s+/g, ' '));
  await page.waitForTimeout(80);
  const image = await page.evaluate(() => new Promise(resolve => window.game.renderer.snapshot(i => resolve(i.src))));
  await writeFile(`${out}/${id}-native.png`, Buffer.from(image.split(',')[1], 'base64'));
  await page.screenshot({ path: `${out}/${id}.png` });
  results.push({ id, ...result });
  }
  assert.deepEqual(errors, []);
  await writeFile(`${out}/result.json`, JSON.stringify({ results, errors }, null, 2));
  console.log(`PASS ${results.length} speech fixtures, no clipping or browser errors`);
} finally { await browser.close(); }
