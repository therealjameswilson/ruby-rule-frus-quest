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
const proofLoop = process.argv.includes('--proof-loop');
const mobile = process.argv.includes('--mobile');
const landscape = process.argv.includes('--landscape');
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE });
try {
  const context = await browser.newContext({ storageState, ...(mobile ? {
    viewport: landscape ? { width: 667, height: 375 } : { width: 375, height: 667 },
    hasTouch: true, isMobile: true, deviceScaleFactor: 3
  } : {}) });
  const page = await context.newPage();
  const cdp = mobile ? await context.newCDPSession(page) : null;
  const errors = [], checkpoints = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  const state = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));
  const canvasPoint = async (x, y) => {
    const box = await page.locator('canvas').first().boundingBox();
    assert(box, 'Game canvas must be visible');
    return { x: box.x + box.width * x / 256, y: box.y + box.height * y / 240, id: 1 };
  };
  const press = async key => {
    if (!mobile) return page.keyboard.press(key, { delay: 50 });
    const point = await canvasPoint(...(key === 'Enter' ? [128, 120] : key === 'KeyX' ? [174, 216] : [225, 205]));
    await page.touchscreen.tap(point.x, point.y);
  };
  const hold = async (key, ms) => {
    if (cdp) {
      const [dx, dy] = { ArrowLeft: [-26, 0], ArrowRight: [26, 0], ArrowUp: [0, -26], ArrowDown: [0, 26] }[key];
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [await canvasPoint(40, 164)] });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [await canvasPoint(40 + dx, 164 + dy)] });
      await page.waitForTimeout(ms);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    } else {
      await page.keyboard.down(key); await page.waitForTimeout(ms); await page.keyboard.up(key);
    }
    await page.waitForTimeout(35);
  };
  const shot = async label => {
    const s = await state();
    checkpoints.push({ label, scene: s.scene, room: s.roomTraversal?.currentRoomId, player: s.player, objective: s.objective, points: s.documentPoints });
    const image = await page.evaluate(() => new Promise(resolve => window.game.renderer.snapshot(i => resolve(i.src))));
    await writeFile(`${out}/${label}.png`, Buffer.from(image.split(',')[1], 'base64'));
    if (mobile) await page.screenshot({ path: `${out}/${label}-viewport.png` });
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
        // Touch dispatch itself spans frames; use shorter corrections, not wider arrival tolerances.
        const pulse = Math.abs(horizontal ? dx : dy) / 72 * 1000;
        await hold(horizontal ? dx < 0 ? 'ArrowLeft' : 'ArrowRight' : dy < 0 ? 'ArrowUp' : 'ArrowDown',
          mobile ? Math.min(140, Math.max(1, pulse * 0.5)) : Math.min(180, Math.max(25, pulse)));
      }
      if (!reached) { await shot('stuck'); assert.fail(`Cannot reach ${JSON.stringify(target)}`); }
    }
  }
  await page.goto('http://127.0.0.1:5195/?text=full');
  await page.waitForFunction(() => window.game?.scene.isActive('TapToStartScene'));
  await press('Enter');
  await page.waitForFunction(scene => window.game.scene.isActive(scene), stacksRetreat || wellLoop || cacheLoop || stacksPersist || proofLoop ? 'ArchiveScene' : 'BlackVaultLairScene');
  await page.waitForTimeout(800);
  const initial = await state();
  if (proofLoop) {
    const interact = async () => {
      await press('Space'); await page.waitForTimeout(250);
      for (let i = 0; i < 12 && (await state()).dialog; i++) {
        await press('Space'); await page.waitForTimeout(250);
      }
    };
    await walk(128, 208); await hold('ArrowDown', 400); await page.waitForTimeout(900);
    await walk(128, 112); await interact();
    await walk(232, 120); await hold('ArrowRight', 400); await page.waitForTimeout(900);
    assert.equal((await state()).roomTraversal.currentRoomId, 'B2');
    await shot('proof-entry');
    await walk(72, 92); await interact(); await shot('proof-early-specialist');
    assert((await state()).visibleThreats.some(t => t.label === 'AMBIGUOUS'), 'Specialist cannot clear flags before the document is examined');
    await walk(128, 192); await interact();
    assert((await state()).visibleThreats.some(t => t.label === 'DANN-E QUEUE'), 'The gate cannot record a review that has not happened');
    await walk(92, 184); await interact(); await shot('proof-flags');
    assert.equal((await state()).objective, 'ASK SPECIALIST');
    await page.reload(); await page.waitForFunction(() => window.game?.scene.isActive('TapToStartScene'));
    await press('Enter'); await page.waitForFunction(() => window.game.scene.isActive('ArchiveScene'));
    await page.waitForTimeout(900);
    assert.equal((await state()).objective, 'ASK SPECIALIST', 'Both readings survive Continue');
    await walk(72, 92); await press('Space'); await page.waitForTimeout(250);
    await shot('proof-meaning-choice');
    const pendingReview = await state();
    assert.match(pendingReview.choice?.title ?? '', /Which wording keeps the meaning/);
    assert.equal(pendingReview.documentPoints, initial.documentPoints + 6, 'Opening the review does not award approval');
    await press('Space'); await page.waitForTimeout(250); await shot('proof-meaning-retry');
    const retry = await state();
    assert.equal(retry.documentPoints, pendingReview.documentPoints, 'Overstating certainty must not earn approval');
    assert.equal(retry.reliability, pendingReview.reliability, 'A practice mistake does not cost reliability');
    assert(retry.visibleThreats.some(t => t.label === 'AMBIGUOUS'));
    assert.equal(retry.objective, 'ASK SPECIALIST');
    await press('Space'); await page.waitForTimeout(250);
    await press('KeyX'); await page.waitForTimeout(250); await shot('proof-reviewed');
    assert.equal((await state()).playerCombat.weapon.swingId, pendingReview.playerCombat.weapon.swingId, 'Choosing B must not also swing the tool');
    assert.equal((await state()).objective, 'SOUTH: RECORD IT');
    assert(!(await state()).visibleThreats.some(t => t.label === 'AMBIGUOUS'));
    await page.reload(); await page.waitForFunction(() => window.game?.scene.isActive('TapToStartScene'));
    await press('Enter'); await page.waitForFunction(() => window.game.scene.isActive('ArchiveScene'));
    await page.waitForTimeout(900);
    assert.equal((await state()).objective, 'SOUTH: RECORD IT', 'Approved wording survives Continue');
    assert.equal((await state()).documentPoints, initial.documentPoints + 9);
    assert(!(await state()).visibleThreats.some(t => t.label === 'AMBIGUOUS'));
    await walk(128, 192); await interact(); await shot('proof-recorded');
    assert.equal((await state()).objective, 'EAST: HINT ROOM');
    assert(!(await state()).visibleThreats.some(t => t.label === 'DANN-E QUEUE'));
    assert.equal((await state()).documentPoints, initial.documentPoints + 12, 'Only four wall clears award points');
    await walk(232, 120); await hold('ArrowRight', 400); await page.waitForTimeout(900);
    await shot('proof-next-room');
    assert.equal((await state()).roomTraversal.currentRoomId, 'B3');
    if (cdp) {
      const beforeSwing = await state();
      const origin = await canvasPoint(40, 164), direction = await canvasPoint(40, 190);
      const button = { ...await canvasPoint(174, 216), id: 2 };
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [origin] });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [direction] });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [direction, button] });
      await page.waitForTimeout(100);
      const controls = await page.evaluate(() => window.rubyRuleTouchControls);
      assert.equal(controls.dpadDirection, 'down');
      assert(controls.pressedButtons.includes('b'), 'Tool and D-pad must have independent pointer ownership');
      assert.notEqual(controls.weaponPhase, 'idle', 'The touch tool button starts a swing while moving');
      assert((await state()).player.y > beforeSwing.player.y + 2, 'The swing must not drop directional input');
      await shot('touch-move-and-swing');
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await page.waitForTimeout(100);
      const released = await page.evaluate(() => window.rubyRuleTouchControls);
      assert.equal(released.dpadDirection, null);
      assert.deepEqual(released.pressedButtons, []);
      await writeFile(`${out}/touch-controls.json`, JSON.stringify({ controls, released }, null, 2));
    }
    assert.deepEqual(errors, []);
  } else if (wellLoop || cacheLoop) {
    const reward = cacheLoop ? 'cache' : 'well';
    const go = async (direction, room) => {
      const [x, y, key] = { north: [128, 56, 'ArrowUp'], south: [128, 208, 'ArrowDown'], east: [232, 120, 'ArrowRight'] }[direction];
      await walk(x, y); await hold(key, 400); await page.waitForTimeout(900);
      await shot(`room-${room}`); assert.equal((await state()).roomTraversal.currentRoomId, room);
    };
    const interact = async () => {
      await press('Space'); await page.waitForTimeout(250);
      for (let i = 0; i < 12 && (await state()).dialog; i++) {
        await press('Space'); await page.waitForTimeout(250);
      }
      assert.equal((await state()).mode, 'explore');
    };
    await go('south', 'B1');
    await walk(128, 112); await interact();
    if (cacheLoop) {
      await go('east', 'B2'); await go('east', 'B3'); await go('north', 'A3');
      await walk(112, 132); await press('Space');
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
    await press('Enter'); await page.waitForFunction(() => window.game.scene.isActive('ArchiveScene'));
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
    const gateNames = () => page.evaluate(() => window.game.scene.getScene('ArchiveScene').children.list
      .filter(object => object.active && object.name?.startsWith('snes-gate-glyph-')).map(object => object.name));
    await shot('stacks-locked-gates');
    assert((await gateNames()).includes('snes-gate-glyph-south-locked'), 'Unsolved WAIT must look locked');
    await walk(128, 112); await press('Space');
    await page.waitForTimeout(250);
    const solved = await state();
    assert(!solved.dialog, 'Filing the tray should not interrupt movement with a dialogue');
    assert(await page.evaluate(() => !window.game.scene.getScene('ArchiveScene').interactables.some(item => item.id === 'stacks-manifest')),
      'A finished tray must stop advertising interaction');
    assert.equal(solved.documentPoints, initial.documentPoints + 6);
    await shot('stacks-solved');
    assert((await gateNames()).includes('snes-gate-glyph-south-open'), 'Solving WAIT must visibly open the gate immediately');
    assert(!(await gateNames()).includes('snes-gate-glyph-south-locked'), 'Old locked gate art must be removed');
    await hold('ArrowLeft', 150);
    assert((await state()).player.x < solved.player.x - 3, 'Movement remains responsive during the filing toast');
    await walk(128, 112);
    await page.reload(); await page.waitForFunction(() => window.game?.scene.isActive('TapToStartScene'));
    await press('Enter'); await page.waitForFunction(() => window.game.scene.isActive('ArchiveScene'));
    await page.waitForTimeout(900); await shot('stacks-continue');
    const restored = await state();
    assert.equal(restored.roomTraversal.currentRoomId, 'B1');
    assert(await page.evaluate(() => !window.game.scene.getScene('ArchiveScene').interactables.some(item => item.id === 'stacks-manifest')),
      'Continue must keep the completed tray quiet');
    assert(!restored.visibleThreats.some(t => t.label === 'WAIT' || t.label === 'PENDING'), 'Solved Stacks walls must not respawn after Continue');
    await press('Space'); await page.waitForTimeout(250);
    assert.equal((await state()).documentPoints, solved.documentPoints, 'Repeat manifest must not award another wall-clear reward');
    for (let i = 0; i < 12 && (await state()).dialog; i++) {
      await press('Space'); await page.waitForTimeout(250);
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
  await walk(128, 212); await press('Space');
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
  await press('Space');
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
