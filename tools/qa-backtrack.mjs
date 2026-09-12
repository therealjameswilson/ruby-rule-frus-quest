// Earned save + actual movement. Collision inspection is read-only QA navigation.
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
assert(process.env.FRUS_QA_STORAGE);
const storageState = JSON.parse(await readFile(process.env.FRUS_QA_STORAGE, 'utf8'));
const out = process.env.FRUS_QA_OUT ?? '/private/tmp/frus-backtrack';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE });
try {
  const context = await browser.newContext({ storageState });
  const page = await context.newPage();
  const errors = [], checkpoints = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  const state = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));
  const hold = async (key, ms) => { await page.keyboard.down(key); await page.waitForTimeout(ms); await page.keyboard.up(key); await page.waitForTimeout(35); };
  const shot = async label => {
    const s = await state();
    checkpoints.push({ label, scene: s.scene, room: s.roomTraversal?.currentRoomId, player: s.player, objective: s.objective, points: s.documentPoints });
    const image = await page.evaluate(() => new Promise(resolve => window.game.renderer.snapshot(i => resolve(i.src))));
    await writeFile(`${out}/${label}.png`, Buffer.from(image.split(',')[1], 'base64'));
    await writeFile(`${out}/checkpoints.json`, JSON.stringify({ checkpoints, errors }, null, 2));
    console.log(JSON.stringify(checkpoints.at(-1)));
  };
  async function walk(x, y) {
    const s = await state();
    const solids = await page.evaluate(scene => {
      const room = window.game.scene.getScene(scene);
      return (room.roomSolids ?? room.solids ?? []).map(r => ({ x: r.x, y: r.y, width: r.width, height: r.height }));
    }, s.scene);
    const free = (x, y) => x >= 16 && x <= 240 && y >= 44 && y <= 216
      && !solids.some(r => x - 8 < r.x + r.width && x + 8 > r.x && y - 3 < r.y + r.height && y + 5 > r.y);
    const key = (x, y) => `${x},${y}`;
    const start = { x: Math.round(s.player.x / 4) * 4, y: Math.round(s.player.y / 4) * 4 };
    const queue = [start], parent = new Map([[key(start.x, start.y), null]]);
    let goal;
    for (let i = 0; i < queue.length; i++) {
      const p = queue[i];
      if (Math.abs(p.x - x) <= 2 && Math.abs(p.y - y) <= 2) { goal = p; break; }
      for (const [dx, dy] of [[4, 0], [-4, 0], [0, 4], [0, -4]]) {
        const n = { x: p.x + dx, y: p.y + dy }, id = key(n.x, n.y);
        if (!free(n.x, n.y) || parent.has(id)) continue;
        parent.set(id, p); queue.push(n);
      }
    }
    assert.ok(goal, `No foot-body route to ${x},${y} in ${s.scene}`);
    const path = [];
    for (let p = goal; p; p = parent.get(key(p.x, p.y))) path.unshift(p);
    const turns = path.filter((p, i) => i === path.length - 1 || i > 0
      && (p.x - path[i - 1].x !== path[i + 1].x - p.x || p.y - path[i - 1].y !== path[i + 1].y - p.y));
    for (const target of turns) {
      let reached = false;
      for (let i = 0; i < 40; i++) {
        const current = await state();
        assert.equal(current.scene, s.scene, 'Unexpected transition during approach');
        const dx = target.x - current.player.x, dy = target.y - current.player.y;
        if (Math.abs(dx) <= 2 && Math.abs(dy) <= 2) { reached = true; break; }
        const horizontal = Math.abs(dx) > 2;
        await hold(horizontal ? dx < 0 ? 'ArrowLeft' : 'ArrowRight' : dy < 0 ? 'ArrowUp' : 'ArrowDown',
          Math.min(180, Math.max(25, Math.abs(horizontal ? dx : dy) / 72 * 1000)));
      }
      if (!reached) { await shot('stuck'); assert.fail(`Cannot reach ${JSON.stringify(target)}`); }
    }
  }
  await page.goto('http://127.0.0.1:5195/?text=full');
  await page.waitForFunction(() => window.game?.scene.isActive('TapToStartScene'));
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.game.scene.isActive('BlackVaultLairScene'));
  await page.waitForTimeout(800);
  const initial = await state();
  await shot('00-vault');
  await walk(128, 212); await page.keyboard.press('Space', { delay: 50 });
  await page.waitForFunction(() => window.game.scene.isActive('SilentReadScene'));
  await page.waitForTimeout(800); await shot('01-proof');
  for (let i = 0; i < 6; i++) {
    await walk(24, 124); await hold('ArrowLeft', 400); await page.waitForTimeout(900);
    await shot(`0${i + 2}-west`);
  }
  assert.equal((await state()).scene, 'ArchiveScene');
  assert.equal((await state()).documentPoints, initial.documentPoints);
  assert.ok((await state()).inventory.includes('Review Folder'));
  await walk(128, 56);
  await page.keyboard.press('Space', { delay: 50 });
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).roomTraversal?.currentRoomId === 'AS');
  await page.waitForTimeout(800); await shot('08-annotation');
  await walk(128, 56); await hold('ArrowUp', 500);
  await page.waitForFunction(() => window.game.scene.isActive('NaraStacksScene'));
  await page.waitForTimeout(900); await shot('09-nara');
  assert.equal((await state()).documentPoints, initial.documentPoints);
  assert.ok((await state()).inventory.includes('Review Folder'));
  assert.deepEqual(errors, []);
  await writeFile(`${out}/earned-storage.json`, JSON.stringify(await context.storageState(), null, 2));
  console.log('Actual backtracking reaches NARA with earned tool and points intact');
} finally { await browser.close(); }
