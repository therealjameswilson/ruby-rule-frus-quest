// Read-only state inspection; all gameplay changes use keyboard or actual touch.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const root = process.env.FRUS_QA_ARCHIVE_OUT;
assert(root, 'Set FRUS_QA_ARCHIVE_OUT to the successful qa-archive-wall.mjs output directory');
const mobile = process.argv.includes('--mobile');
const out = process.env.FRUS_QA_OUT ?? `${root}/evidence`;
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_EXECUTABLE ? { executablePath: process.env.CHROMIUM_EXECUTABLE } : {}) });
const errors = [], result = {};
try {
  const cases = [['panel', `${root}/source-note-review-storage.json`], ['codex', `${root}/earned-storage.json`]];
  if (process.env.FRUS_QA_LEGACY) cases.push(['legacy', process.env.FRUS_QA_LEGACY]);
  for (const [name, storage] of cases) {
    const stored = JSON.parse(await readFile(storage, 'utf8'));
    const original = JSON.parse(stored.origins.flatMap(origin => origin.localStorage).find(entry => entry.name === 'rubyRuleFrusQuestSave').value).state;
    const context = await browser.newContext({ storageState: stored,
      viewport: mobile ? { width: 375, height: 667 } : { width: 1024, height: 960 }, hasTouch: mobile, isMobile: mobile, deviceScaleFactor: mobile ? 3 : 1 });
    const page = await context.newPage(), cdp = await context.newCDPSession(page);
    page.on('pageerror', error => errors.push(String(error)));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    const state = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));
    const key = async key => { await page.keyboard.press(key, { delay: 60 }); await page.waitForTimeout(180); };
    const tap = async (x, y) => {
      const b = await page.locator('canvas:not(#pixel-proof-overlay)').boundingBox();
      const p = { x: b.x + x * b.width / 256, y: b.y + y * b.height / 240, id: 1 };
      if (mobile) {
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [p] }); await page.waitForTimeout(60);
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      } else await page.mouse.click(p.x, p.y, { delay: 60 });
      await page.waitForTimeout(180);
    };
    const shot = async label => {
      const image = await page.evaluate(() => new Promise(resolve => window.game.renderer.snapshot(image => resolve(image.src))));
      await writeFile(`${out}/${label}-native.png`, Buffer.from(image.split(',')[1], 'base64'));
      await page.screenshot({ path: `${out}/${label}.png` });
    };
    await page.goto(new URL('?text=full', process.env.FRUS_QA_URL ?? 'http://127.0.0.1:5195/').href);
    await page.waitForFunction(() => window.render_game_to_text && JSON.parse(window.render_game_to_text()).scene === 'TapToStartScene');
    if (mobile) await tap(86, 154); else await key('Enter');
    const scene = name === 'panel' ? 'ArchiveScene' : name === 'legacy' ? original.currentScene : 'NetworkScene';
    await page.waitForFunction(scene => JSON.parse(window.render_game_to_text()).scene === scene, scene); await page.waitForTimeout(1100);
    if (name === 'panel') {
      if (mobile) await tap(225, 205); else await key('Space');
      assert.equal((await state()).mode, 'choice');
      const before = await state();
      const layout = await page.evaluate(() => window.game.scene.getScene('ArchiveScene').children.getByName('source-note-board').list
        .filter(object => typeof object.text === 'string' || object.type === 'Rectangle' && [100, 112, 216].includes(object.width))
        .map(object => { const bounds = object.getBounds(); return { type: object.type, text: object.text, x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height }; }));
      const box = await page.locator('canvas:not(#pixel-proof-overlay)').boundingBox();
      assert.equal(layout.filter(object => object.type === 'Rectangle').length, 3);
      for (const object of layout) {
        assert(object.x >= 9 && object.x + object.width <= 247 && object.y >= 27 && object.y + object.height <= 213, JSON.stringify(object));
        if (object.type === 'Rectangle') { assert(object.y + object.height < 176); assert(object.height * box.height / 240 >= 44); }
      }
      if (!mobile) {
        await page.keyboard.down('ArrowLeft'); await page.waitForTimeout(500); await page.keyboard.up('ArrowLeft');
        await key('Tab'); assert.equal((await state()).scene, 'CodexScene'); await key('Escape'); assert.equal((await state()).mode, 'choice');
      }
      await page.waitForTimeout(1000);
      const waiting = await state(); assert.deepEqual(waiting.player, before.player); assert.equal(waiting.reliability, before.reliability);
      await shot('panel');
      if (mobile) await tap(237, 173); else await key('x');
      const canceled = await state(); assert.equal(canceled.mode, 'explore'); assert.equal(canceled.playerCombat.weapon.swingId, before.playerCombat.weapon.swingId);
      assert.equal(canceled.documentPoints, 22);
      if (mobile) await tap(225, 205); else await key('Space');
      assert.equal((await state()).mode, 'choice');
      if (mobile) await tap(225, 205); else await key('Space');
      const repaired = await state(); assert.equal(repaired.mode, 'choice'); assert.equal(repaired.documentPoints, 22);
      assert.equal(repaired.sceneProgress.sourceNote47ReadershipCorrected, 1); await shot('file-highlight');
      if (mobile) await tap(225, 205); else await key('Space');
      const filed = await state(); assert.equal(filed.mode, 'explore'); assert.equal(filed.documentPoints, 28);
      assert.equal(filed.documentCandidates.find(document => document.id === 'source_note_047').repository, 'Fictional National Archives Collection');
      result.panel = { layout, position: before.player, inputSwallowed: true };
    } else if (name === 'legacy') {
      const restored = await state(), note = restored.documentCandidates.find(document => document.id === 'source_note_047');
      const oldNote = original.documentCandidates.find(document => document.id === 'source_note_047');
      assert.equal(oldNote.repository, ''); assert.equal(note.repository, 'Fictional National Archives Collection');
      assert.equal(note.workflowState, oldNote.workflowState); assert.equal(note.firstFootnote.readership, null);
      assert.equal(restored.documentPoints, original.documentPoints);
      assert.deepEqual(restored.documentCandidates.filter(document => document.id !== note.id), original.documentCandidates.filter(document => document.id !== note.id));
      assert.equal(restored.sceneProgress.sourceNote47ReadershipCorrected, original.sceneProgress.sourceNote47ReadershipCorrected);
      await shot('legacy-continue'); result.legacy = { scene, points: restored.documentPoints, note };
    } else {
      const before = await state();
      if (mobile) { await tap(224, 16); await tap(176, 34); await tap(128, 210); } else await key('Tab');
      assert.equal((await state()).scene, 'CodexScene');
      await tap(176, 24); await tap(128, 116);
      let readout = (await state()).codexView;
      assert.equal(readout.selectedId, 'item-source-note-47'); assert.equal(readout.view, 'detail');
      const pages = [];
      for (let index = 0; index < readout.pages; index++) {
        readout = (await state()).codexView; pages.push(readout.text); await shot(`note-${index + 1}`);
        if (index + 1 < readout.pages) { if (mobile) await tap(232, 214); else await key('ArrowRight'); }
      }
      assert(pages.join(' ').includes('Fictional National Archives'));
      assert(pages.join(' ').includes('ORIGINAL CLASSIFICATION'));
      assert(pages.join(' ').includes('No evidence does not prove'));
      await tap(232, 24); const after = await state(); assert.equal(after.scene, 'NetworkScene');
      assert.deepEqual(after.documentCandidates, before.documentCandidates); assert.equal(after.documentPoints, before.documentPoints);
      result.codex = { pages, unchangedDocuments: true };
    }
    await context.close();
  }
  assert.deepEqual(errors, []); console.log('PASS', mobile ? 'touch' : 'desktop', 'source-note layout, input, evidence readback');
} catch (error) { result.failure = String(error); console.error(error); process.exitCode = 1; }
finally { await writeFile(`${out}/results.json`, JSON.stringify({ ...result, errors }, null, 2)); await browser.close(); }
