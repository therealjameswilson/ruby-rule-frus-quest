// Earned save + actual movement. Collision inspection is read-only QA navigation.
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
assert(process.env.FRUS_QA_STORAGE);
const storageState = JSON.parse(await readFile(process.env.FRUS_QA_STORAGE, 'utf8'));
const out = process.env.FRUS_QA_OUT ?? '/private/tmp/frus-backtrack';
const stacksRetreat = process.argv.includes('--stacks-retreat');
const wellLoop = process.argv.includes('--well-loop');
const cacheLoop = process.argv.includes('--cache-loop');
const stacksPersist = process.argv.includes('--stacks-persist');
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
  await page.waitForFunction(scene => window.game.scene.isActive(scene), stacksRetreat || wellLoop || cacheLoop || stacksPersist ? 'ArchiveScene' : 'BlackVaultLairScene');
  await page.waitForTimeout(800);
  const initial = await state();
  if (wellLoop || cacheLoop) {
    const reward = cacheLoop ? 'cache' : 'well';
    const go = async (direction, room) => {
      const [x, y, key] = { north: [128, 56, 'ArrowUp'], south: [128, 208, 'ArrowDown'], east: [232, 120, 'ArrowRight'] }[direction];
      await walk(x, y); await hold(key, 400); await page.waitForTimeout(900);
      await shot(`room-${room}`); assert.equal((await state()).roomTraversal.currentRoomId, room);
    };
    const interact = async () => {
      await page.keyboard.press('Space', { delay: 50 }); await page.waitForTimeout(250);
      for (let i = 0; i < 12 && (await state()).dialog; i++) {
        await page.keyboard.press('Space', { delay: 50 }); await page.waitForTimeout(250);
      }
      assert.equal((await state()).mode, 'explore');
    };
    await go('south', 'B1');
    await walk(128, 112); await interact();
    if (cacheLoop) {
      await go('east', 'B2'); await go('east', 'B3'); await go('north', 'A3');
      await walk(112, 132); await page.keyboard.press('Space', { delay: 50 });
      await page.waitForTimeout(300); await shot('archivist-clue');
      assert.match(JSON.stringify((await state()).dialog), /left shelf/i);
      await interact();
      await walk(48, 108); await interact();
      await go('south', 'B3'); await go('south', 'C3');
    } else {
      await go('south', 'C1');
      await walk(128, 144); await interact();
      await go('south', 'D1'); await go('east', 'D2');
    }
    await walk(128, 160); await interact(); await shot(`${reward}-collected`);
    const collected = await state();
    if (cacheLoop) assert(collected.volumeFragments.includes('Hidden Cache Fragment'));
    await context.storageState({ path: `${out}/earned-${reward}-storage.json` });
    await page.reload(); await page.waitForFunction(() => window.game?.scene.isActive('TapToStartScene'));
    await page.keyboard.press('Enter'); await page.waitForFunction(() => window.game.scene.isActive('ArchiveScene'));
    await page.waitForTimeout(900);
    assert.equal((await state()).roomTraversal.currentRoomId, cacheLoop ? 'C3' : 'D2');
    await interact(); await shot(`${reward}-repeat-after-continue`);
    assert.equal((await state()).documentPoints, collected.documentPoints, 'Hidden treasure must award points only once across Continue');
    if (cacheLoop) {
      assert.deepEqual((await state()).volumeFragments, collected.volumeFragments);
      await go('north', 'B3');
    }
    assert.deepEqual(errors, []);
    console.log(`Earned hidden ${reward} survives Continue without duplicate reward`);
  } else if (stacksPersist) {
    await walk(128, 208); await hold('ArrowDown', 400); await page.waitForTimeout(900);
    assert.equal((await state()).roomTraversal.currentRoomId, 'B1');
    await walk(128, 112); await page.keyboard.press('Space', { delay: 50 });
    await page.waitForTimeout(250);
    for (let i = 0; i < 12 && (await state()).dialog; i++) {
      await page.keyboard.press('Space', { delay: 50 }); await page.waitForTimeout(250);
    }
    const solved = await state();
    assert.equal(solved.documentPoints, initial.documentPoints + 6);
    await shot('stacks-solved');
    await page.reload(); await page.waitForFunction(() => window.game?.scene.isActive('TapToStartScene'));
    await page.keyboard.press('Enter'); await page.waitForFunction(() => window.game.scene.isActive('ArchiveScene'));
    await page.waitForTimeout(900); await shot('stacks-continue');
    const restored = await state();
    assert.equal(restored.roomTraversal.currentRoomId, 'B1');
    assert(!restored.visibleThreats.some(t => t.label === 'WAIT' || t.label === 'PENDING'), 'Solved Stacks walls must not respawn after Continue');
    await page.keyboard.press('Space', { delay: 50 }); await page.waitForTimeout(250);
    assert.equal((await state()).documentPoints, solved.documentPoints, 'Repeat manifest must not award another wall-clear reward');
    for (let i = 0; i < 12 && (await state()).dialog; i++) {
      await page.keyboard.press('Space', { delay: 50 }); await page.waitForTimeout(250);
    }
    await walk(128, 208); await hold('ArrowDown', 400); await page.waitForTimeout(900);
    await shot('stacks-open-after-continue');
    assert.equal((await state()).roomTraversal.currentRoomId, 'C1', 'Solved south exit remains open after Continue');
    assert.deepEqual(errors, []);
    console.log('Optional Stacks remains solved across Continue without repeat rewards');
  } else if (stacksRetreat) {
    assert.equal(initial.roomTraversal.currentRoomId, 'A1');
    await walk(128, 208); await hold('ArrowDown', 400);
    await page.waitForTimeout(900); await shot('stacks-entry');
    assert.equal((await state()).roomTraversal.currentRoomId, 'B1');
    await walk(128, 208); await hold('ArrowDown', 400);
    await page.waitForTimeout(600); await shot('stacks-forward-locked');
    assert.equal((await state()).roomTraversal.currentRoomId, 'B1', 'WAIT still blocks forward progress');
    await walk(128, 56); await hold('ArrowUp', 400);
    await page.waitForTimeout(900); await shot('stacks-retreat');
    const returned = await state();
    assert.equal(returned.roomTraversal.currentRoomId, 'A1', 'Optional Stacks must allow retreat before solving WAIT');
    assert.equal(returned.documentPoints, initial.documentPoints);
    assert.deepEqual(errors, []);
    console.log('Unsolved optional Stacks allows retreat with progress unchanged');
  } else {
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
  }
} finally { await browser.close(); }
