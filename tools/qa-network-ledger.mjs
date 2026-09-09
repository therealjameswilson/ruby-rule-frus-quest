import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright");

const base = process.env.FRUS_QA_URL ?? "http://127.0.0.1:5195/";
const root = process.env.FRUS_QA_OUT ?? "/tmp/frus-network-ledger";
const crossing = process.argv.includes("--crossing");
const ledgerOnly = process.argv.includes("--ledger-only");
const currentCompletedReturn = process.argv.includes("--current-completed-return");
const completedReturn = process.argv.includes("--completed-return") || currentCompletedReturn;
const pointerBoard = process.argv.includes("--pointer");
const rotate = process.argv.includes("--rotate");
const routingHelpOnly = process.argv.includes("--routing-help-only");
const routingHelp = process.argv.includes("--routing-help") || routingHelpOnly;
const mobileViewport = {
  width: Number(process.env.FRUS_QA_WIDTH ?? 375), height: Number(process.env.FRUS_QA_HEIGHT ?? 667)
};
const mobileDpr = Number(process.env.FRUS_QA_DPR ?? 3);
assert(Object.values(mobileViewport).every(value => Number.isInteger(value) && value > 0)
  && Number.isFinite(mobileDpr) && mobileDpr > 0);
assert(process.env.FRUS_QA_STORAGE, "Set FRUS_QA_STORAGE to earned-storage.json from qa-archive-wall.mjs");
await mkdir(root, { recursive: true });
const browser = await chromium.launch({ headless: true,
  ...(process.env.CHROMIUM_EXECUTABLE ? { executablePath: process.env.CHROMIUM_EXECUTABLE } : {}) });

async function run(label, mobile) {
  const out = `${root}/${label}`;
  await mkdir(out, { recursive: true });
  const context = await browser.newContext({
    storageState: JSON.parse(await readFile(process.env.FRUS_QA_STORAGE, "utf8")),
    viewport: mobile ? mobileViewport : { width: 1024, height: 960 },
    hasTouch: mobile,
    isMobile: mobile,
    deviceScaleFactor: mobile ? mobileDpr : 1
  });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  const state = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));
  let screenshotIndex = 0;
  const roomObjectBaselines = new Map();

  async function point(x, y, pointerId = 1) {
    const bounds = await page.locator("canvas").first().boundingBox();
    assert(bounds, "Canvas bounds unavailable");
    return {
      x: bounds.x + x * bounds.width / 256,
      y: bounds.y + y * bounds.height / 240,
      id: pointerId
    };
  }

  async function tap(x, y) {
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [await point(x, y)]
    });
    await page.waitForTimeout(48);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  }

  async function press(key = "Space") {
    if (mobile) await tap(...(key === "Enter" ? [86, 154] : key === "x" ? [174, 216] : [225, 205]));
    else await page.keyboard.press(key, { delay: 45 });
    await page.waitForTimeout(170);
  }

  async function direction(key, milliseconds = 80) {
    if (mobile) {
      const offsets = {
        ArrowLeft: [-26, 0],
        ArrowRight: [26, 0],
        ArrowUp: [0, -26],
        ArrowDown: [0, 26]
      };
      const [dx, dy] = offsets[key];
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [await point(40, 178)]
      });
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [await point(40 + dx, 178 + dy)]
      });
      await page.waitForTimeout(milliseconds);
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    } else {
      await page.keyboard.down(key);
      await page.waitForTimeout(milliseconds);
      await page.keyboard.up(key);
    }
    await page.waitForTimeout(20);
  }

  async function move(x, y, destination) {
    let stalled = 0;
    for (let attempt = 0; attempt < 160; attempt += 1) {
      const before = await state();
      if (destination && (before.scene === destination || before.roomTraversal?.currentRoomId === destination)) {
        await page.waitForTimeout(450);
        return;
      }
      const dx = x - before.player.x;
      const dy = y - before.player.y;
      if (!destination && Math.hypot(dx, dy) < 5) return;
      const key = Math.abs(dx) > Math.abs(dy)
        ? dx > 0 ? "ArrowRight" : "ArrowLeft"
        : dy > 0 ? "ArrowDown" : "ArrowUp";
      await direction(key);
      const after = await state();
      stalled = Math.hypot(after.player.x - before.player.x, after.player.y - before.player.y) < 1
        ? stalled + 1
        : 0;
      if (stalled > 12) {
        throw new Error(`${label}: blocked at ${JSON.stringify(after.player)} toward ${x},${y}; ${after.objective}`);
      }
    }
    throw new Error(`${label}: movement timed out toward ${x},${y}`);
  }

  async function checkpoint(name) {
    await page.waitForTimeout(240);
    const current = await state();
    if (current.scene === "NetworkScene") {
      const resources = await page.evaluate(() => {
        const scene = window.game.scene.getScene("NetworkScene");
        return { room: scene.currentRoomId, tracked: scene.roomObjects.length,
          guides: scene.roomObjects.filter(object => object.name === "network-routing-guide"
            || object.name === "network-clearance-guide").length };
      });
      if (!roomObjectBaselines.has(resources.room)) roomObjectBaselines.set(resources.room, resources.tracked);
      assert(resources.tracked <= roomObjectBaselines.get(resources.room) + 40,
        `Walking must not accumulate destroyed route markers: ${JSON.stringify(resources)}`);
      assert(resources.guides <= 1, "Each room reuses one route guide");
      if (resources.room === "N2") {
        const center = await page.evaluate(() => {
          const scene = window.game.scene.getScene("NetworkScene");
          return { reward: scene.vaultReward.visible, inbox: scene.vaultInbox.visible,
            ready: scene.classNetReviewComplete, collected: scene.clearanceTokenCollected };
        });
        assert.equal(center.reward, center.ready && !center.collected,
          "The reward must appear only after deliberate review and disappear on pickup");
        assert.equal(center.inbox, !center.reward, "Inbox and reward must never compete");
        await writeFile(`${out}/vault-center-${name}.json`, JSON.stringify(center));
      }
      await writeFile(`${out}/guide-resources-${name}.json`, JSON.stringify(resources));
    }
    const path = `${out}/${String(screenshotIndex++).padStart(2, "0")}-${name}`;
    const native = await page.evaluate(() => new Promise(resolve => window.game.renderer.snapshot(image => resolve(image.src))));
    await writeFile(`${path}-native.png`, Buffer.from(native.split(",")[1], "base64"));
    await page.screenshot({ path: `${path}.png` });
    await writeFile(`${path}.json`, JSON.stringify(current, null, 2));
    console.log(label, name, JSON.stringify({
      room: current.roomTraversal?.currentRoomId,
      objective: current.objective,
      carriedPacket: current.sceneProgress.networkRoutingCarried,
      carriedDocket: current.sceneProgress.classNetVaultDocketCarried,
      reliability: current.reliability,
      held: current.heldItem,
      player: current.player
    }));
    return current;
  }

  async function shiftEntry(direction) {
    assert.equal((await state()).mode, "choice");
    // Exercise the generous hit target outside the visible arrow button.
    if (mobile) await tap(direction < 0 ? 14 : 193, 168);
    else if (pointerBoard) {
      const target = await point(direction < 0 ? 14 : 193, 168);
      await page.mouse.click(target.x, target.y);
    }
    else await press(direction < 0 ? "ArrowLeft" : "ArrowRight");
    await page.waitForTimeout(150);
  }

  async function fileEntry() {
    assert.equal((await state()).mode, "choice");
    if (mobile) await tap(104, 168);
    else if (pointerBoard) {
      const target = await point(104, 168);
      await page.mouse.click(target.x, target.y);
    }
    else {
      // Read selection only; actual input must select and file the entry.
      if (await page.evaluate(() => window.game.scene.getScene("NetworkScene").ledgerChoice.selected !== "file")) {
        await press("ArrowDown");
      }
      await press();
    }
    await page.waitForTimeout(150);
  }

  try {
    await page.goto(`${base}?text=full`);
    await page.waitForFunction(() => window.render_game_to_text && JSON.parse(window.render_game_to_text()).scene === 'TapToStartScene');
    await press("Enter");
    await page.waitForFunction(scene => window.render_game_to_text
      && JSON.parse(window.render_game_to_text()).scene === scene,
    completedReturn ? "ReferralVaultScene" : "NetworkScene");
    await page.waitForTimeout(1200);
    let current = await checkpoint("initial");
    if (completedReturn) {
      const earned = { points: current.documentPoints, inventory: current.inventory,
        documents: current.documentCandidates };
      assert(current.inventory.includes("Clearance Token"));
      if (!currentCompletedReturn) {
        assert.equal(current.sceneProgress.classNetWithholdingSlot, undefined,
          "Use an actual completed pre-puzzle save to test compatibility");
      }
      await move(8, 124, "NetworkScene");
      current = await checkpoint("legacy-completed-return");
      assert.equal(current.roomTraversal.currentRoomId, "N2");
      assert.equal(current.sceneProgress.classNetVaultReviewComplete, 1);
      await move(216, 194); await move(195, 194); await press();
      current = await checkpoint("legacy-ledger-stays-complete");
      assert.equal(current.mode, "explore");
      assert.equal(current.objective, "EXIT EAST - REFERRAL");
      assert.deepEqual({ points: current.documentPoints, inventory: current.inventory,
        documents: current.documentCandidates }, earned);
      assert.deepEqual(errors, []);
      return;
    }
    if (!ledgerOnly) {
      assert.equal(current.objective, "TAKE ROUTING BATCH");

      if (crossing) {
        await move(90, 124);
        await direction("ArrowRight", 160);
        assert((await state()).player.x < 112, "The sealed crossing must physically block the player");
        await page.waitForFunction(() => {
          const prompt = window.game.scene.getScene("NetworkScene").interactionPrompt;
          return prompt.visible && prompt.currentText === "FILE PUBLIC FIRST";
        });
        await checkpoint("crossing-prerequisite-prompt");
        // A live hit can interrupt windup. Retry the real control, never skip combat.
        for (let attempt = 0; attempt < 6; attempt += 1) {
          await direction("ArrowRight", 20);
          await press("x");
          if (/public packet/i.test((await state()).latestMessage)) break;
          await page.waitForTimeout(350);
        }
        current = await checkpoint("crossing-needs-public-packet");
        assert.notEqual(current.sceneProgress.networkStampCrossingOpen, 1);
        assert.match(current.latestMessage, /public packet/i);
      }

      await move(35,190);await move(128,190);await press();
      current = await checkpoint("routing-batch-held");
      assert.equal(current.sceneProgress.networkRoutingCarried, 1);
      assert.equal(current.objective, "1/4 TO OPENNET");

      await move(60, 190);
      await move(60, 146);
      await press();
      current = await checkpoint("packet-two-auto-handoff");
      assert.equal(current.sceneProgress.networkRoutingStep, 1);
      assert.equal(current.sceneProgress.networkRoutingCarried, 2);
      assert.equal(current.objective, "2/4 PUBLIC PROOF");

      const savedRoute = await page.evaluate(() => {
        const raw = localStorage.getItem("rubyRuleFrusQuestSave");
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return {
          scene: parsed.state.currentScene,
          step: parsed.state.sceneProgress.networkRoutingStep,
          carried: parsed.state.sceneProgress.networkRoutingCarried,
          objective: parsed.state.objective
        };
      });
      console.log(label, "saved-route", JSON.stringify(savedRoute));
      assert.deepEqual(savedRoute, {
        scene: "NetworkScene",
        step: 1,
        carried: 2,
        objective: "2/4 PUBLIC PROOF"
      });

      await page.goto(`${base}?text=full`);
      await page.waitForFunction(() => window.render_game_to_text
        && JSON.parse(window.render_game_to_text()).scene === "TapToStartScene");
      await press("Enter");
      await page.waitForFunction(() => window.render_game_to_text
        && JSON.parse(window.render_game_to_text()).scene === "NetworkScene");
      await page.waitForTimeout(900);
      current = await checkpoint("packet-two-restored");
      assert.equal(current.sceneProgress.networkRoutingStep, 1);
      assert.equal(current.sceneProgress.networkRoutingCarried, 2);
      assert.equal(current.objective, "2/4 PUBLIC PROOF");

      if (routingHelp) {
        const before = { points: current.documentPoints, documents: current.documentCandidates, inventory: current.inventory };
        await move(38, 92);
        await press();
        current = await checkpoint("marcus-explains-marking");
        assert.equal(current.mode, "dialog");
        assert.equal(current.sceneProgress.networkRoutingHintOrder, 2);
        assert.equal(current.sceneProgress.networkRoutingStep, 1);
        assert.equal(current.sceneProgress.networkRoutingCarried, 2);
        assert.equal(current.objective, "2/4 TO OPENNET");
        if (mobile) {
          const bounds = await page.evaluate(() => {
            const dialog = window.game.scene.getScene("NetworkScene").dialog;
            const body = dialog.bodyText.getBounds();
            const frame = dialog.container.getBounds();
            return { bodyBottom: body.bottom, frameBottom: frame.bottom };
          });
          assert(bounds.bodyBottom <= 174 && bounds.frameBottom <= 174,
            "Marcus's help must sit above the touch buttons");
        }
        assert.deepEqual({ points: current.documentPoints, documents: current.documentCandidates, inventory: current.inventory }, before);
        for (let advance = 0; advance < 8 && (await state()).mode === "dialog"; advance++) await press();
        assert.equal((await state()).mode, "explore");
        await move(60, 146);
        if (routingHelpOnly) {
          await checkpoint("marcus-help-dismissed");
          assert.deepEqual(errors, []);
          return;
        }
      }

      if (crossing) {
        const before = await state();
        await move(90, 124);
        await direction("ArrowRight", 120);
        await page.waitForFunction(() => {
          const prompt = window.game.scene.getScene("NetworkScene").interactionPrompt;
          return prompt.visible && prompt.currentText === "STAMP SEAL";
        });
        await checkpoint("crossing-ready-prompt");
        if (mobile) await tap(224, 16);
        else await page.keyboard.press("Escape");
        await page.waitForTimeout(200);
        assert.notEqual((await state()).mode, "explore");
        await checkpoint("crossing-paused");
        if (mobile) await tap(224, 34);
        else await page.keyboard.press("Escape");
        await page.waitForTimeout(200);
        assert.equal((await state()).mode, "explore");
        assert.notEqual((await state()).sceneProgress.networkStampCrossingOpen, 1,
          "Closing pause must not stamp through the menu");
        for (let attempt = 0; attempt < 6 && (await state()).sceneProgress.networkStampCrossingOpen !== 1; attempt += 1) {
          await direction("ArrowRight", 20);
          await press("x");
          await page.waitForTimeout(250);
        }
        current = await checkpoint("stamp-opens-crossing");
        assert.equal(current.sceneProgress.networkStampCrossingOpen, 1);
        assert.equal(current.sceneProgress.networkRoutingStep, 1);
        assert.equal(current.sceneProgress.networkRoutingCarried, 2);
        assert.equal(current.documentPoints, before.documentPoints);
        assert.deepEqual(current.inventory, before.inventory);
        assert.deepEqual(current.documentCandidates, before.documentCandidates);
        await page.goto(`${base}?text=full`);
        await page.waitForFunction(() => window.render_game_to_text && JSON.parse(window.render_game_to_text()).scene === "TapToStartScene");
        await press("Enter");
        await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).scene === "NetworkScene");
        await page.waitForTimeout(700);
        current = await checkpoint("crossing-persists-on-continue");
        assert.equal(current.sceneProgress.networkStampCrossingOpen, 1);
        assert.equal(current.sceneProgress.networkRoutingCarried, 2);
        await move(60, 146);
      }

      await press();
      current = await checkpoint("packet-three-auto-handoff");
      assert.equal(current.sceneProgress.networkRoutingStep, 2);
      assert.equal(current.sceneProgress.networkRoutingCarried, 3);
      assert.equal(current.objective, "3/4 INTERNAL REVIEW");
      const reliabilityBeforeWrongNetwork = current.reliability;

      await press();
      current = await checkpoint("wrong-network-immediate-retry");
      assert.equal(current.sceneProgress.networkRoutingStep, 2);
      assert.equal(current.sceneProgress.networkRoutingCarried, 3);
      assert.equal(current.objective, "3/4 TO CLASSNET");
      assert(current.reliability <= reliabilityBeforeWrongNetwork - 2);
      assert.match(current.latestMessage, /remains in hand/i);

      if (crossing) {
        await move(60, 124);
        await move(160, 124);
        current = await checkpoint("walk-through-earned-crossing");
        assert(current.player.x >= 155);
        assert.equal(current.sceneProgress.networkRoutingComplete ?? 0, 0, "Shortcut cannot bypass human routing");
        await move(196, 124);
      } else {
        await move(60, 190);
        await move(196, 190);
        await move(196, 146);
      }
      await press();
      current = await checkpoint("packet-four-auto-handoff");
      assert.equal(current.sceneProgress.networkRoutingStep, 3);
      assert.equal(current.sceneProgress.networkRoutingCarried, 4);
      assert.equal(current.objective, "4/4 CLASSIFIED");

      await press();
      current = await checkpoint("routing-room-cleared");
      assert.equal(current.sceneProgress.networkRoutingComplete, 1);
      assert.equal(current.sceneProgress.networkRoutingCarried, 0);
      assert.equal(current.objective, "EXIT EAST - VAULT");

      await move(216, 190);
      await move(216, 124);
      await move(248, 124, "N2");
      current = await checkpoint("classnet-entry");
      assert.equal(current.objective, "TAKE REVIEW BATCH");

      await move(128, 164);
      await press();
      current = await checkpoint("review-batch-held");
      assert.equal(current.sceneProgress.classNetVaultDocketCarried, 1);
      assert.equal(current.objective, "1/3 TO HUMAN DESK");

      await move(61, 195);
      await press();
      current = await checkpoint("docket-two-auto-handoff");
      assert.equal(current.sceneProgress.classNetVaultReviewStep, 1);
      assert.equal(current.sceneProgress.classNetVaultDocketCarried, 2);
      assert.equal(current.objective, "2/3 TO RELEASE BOARD");
      const savedVaultPosition = { ...current.player };

      await page.goto(`${base}?text=full`);
      await page.waitForFunction(() => window.render_game_to_text
        && JSON.parse(window.render_game_to_text()).scene === "TapToStartScene");
      await press("Enter");
      await page.waitForFunction(() => window.render_game_to_text
        && JSON.parse(window.render_game_to_text()).scene === "NetworkScene");
      await page.waitForTimeout(900);
      current = await checkpoint("docket-two-restored-in-vault");
      assert.equal(current.roomTraversal?.currentRoomId, "N2");
      assert.equal(current.sceneProgress.classNetVaultReviewStep, 1);
      assert.equal(current.sceneProgress.classNetVaultDocketCarried, 2);
      assert.equal(current.objective, "2/3 TO RELEASE BOARD");
      assert.equal(current.heldItem, "Review Batch: E.O.");
      assert(Math.hypot(current.player.x - savedVaultPosition.x, current.player.y - savedVaultPosition.y) <= 2);
      const reliabilityBeforeWrongDesk = current.reliability;

      await press();
      current = await checkpoint("wrong-desk-immediate-retry");
      assert.equal(current.sceneProgress.classNetVaultReviewStep, 1);
      assert.equal(current.sceneProgress.classNetVaultDocketCarried, 2);
      assert.equal(current.objective, "2/3 TO RELEASE BOARD");
      assert(current.reliability <= reliabilityBeforeWrongDesk - 2);
      assert.match(current.latestMessage, /remains in hand/i);

      await move(92, 164);
      await move(92, 110);
      await move(128, 110);
      await press();
      current = await checkpoint("docket-three-auto-handoff");
      assert.equal(current.sceneProgress.classNetVaultReviewStep, 2);
      assert.equal(current.sceneProgress.classNetVaultDocketCarried, 3);
      assert.equal(current.objective, "3/3 TO LEDGER");

      await move(92, 110);
      await move(92, 164);
      await move(195, 195);
    }
    await press();
    current = await checkpoint("withheld-memo-decision");
    assert.equal(current.mode, "choice");
    assert.equal(current.sceneProgress.classNetVaultReviewStep, 2);
    assert.equal(current.sceneProgress.classNetVaultDocketCarried, 3);
    assert(!current.sceneProgress.classNetVaultReviewComplete);
    assert(!current.inventory.includes("Clearance Token"));
    if (rotate) {
      await page.setViewportSize({ width: mobileViewport.height, height: mobileViewport.width });
      await page.waitForTimeout(700);
      const rotated = await checkpoint("ledger-landscape");
      assert.deepEqual(rotated.player, current.player);
      assert.equal(rotated.reliability, current.reliability);
      assert.equal(rotated.mode, "choice");
    }
    const layout = await page.evaluate(() => {
      const board = window.game.scene.getScene("NetworkScene").children.getByName("withholding-chronology-board");
      const scale = window.game.canvas.getBoundingClientRect().width / 256;
      return board.list.filter(object => object.input).map(object => {
        const hit = object.input.hitArea;
        return { name: object.name, x: object.x - object.width * object.originX + hit.x,
          y: object.y - object.height * object.originY + hit.y,
          width: hit.width, height: hit.height, cssWidth: hit.width * scale, cssHeight: hit.height * scale };
      });
    });
    assert.equal(layout.length, 4);
    for (const button of layout) {
      assert(button.cssWidth >= 44 && button.cssHeight >= 44, `${button.name}: touch target too small`);
      assert(button.x >= 0 && button.y >= 30 && button.x + button.width <= 256);
      for (const other of layout.filter(other => other !== button)) {
        assert(button.x + button.width <= other.x || other.x + other.width <= button.x
          || button.y + button.height <= other.y || other.y + other.height <= button.y,
        `${button.name} overlaps ${other.name}`);
      }
      // Existing touch A and B capture these regions before forwarding board input.
      for (const control of [{ x: 196, y: 176, width: 58, height: 58 }, { x: 150, y: 192, width: 48, height: 48 }]) {
        assert(button.x + button.width <= control.x || control.x + control.width <= button.x
          || button.y + button.height <= control.y || control.y + control.height <= button.y,
        `${button.name} overlaps the touch controls`);
      }
    }
    await writeFile(`${out}/board-layout.json`, JSON.stringify(layout, null, 2));
    const frozen = { player: current.player, combat: current.playerCombat, threats: current.visibleThreats, reliability: current.reliability };
    await page.waitForTimeout(2200);
    const reading = await state();
    assert.deepEqual({ player: reading.player, combat: reading.playerCombat, threats: reading.visibleThreats, reliability: reading.reliability }, frozen);
    await context.storageState({path:`${out}/pending-ledger.json`});
    await fileEntry();
    assert.match((await state()).latestMessage, /KEEP A WITHHOLDING ENTRY/);
    await shiftEntry(1);
    await fileEntry();
    assert.match((await state()).latestMessage, /CONVERSATION TIME/);
    await shiftEntry(1);
    await shiftEntry(1);
    await fileEntry();
    const rejected = await checkpoint("withholding-entry-needs-revision");
    assert.equal(rejected.mode, "choice");
    assert.equal(rejected.sceneProgress.classNetWithholdingSlot, 3);
    assert.equal(rejected.sceneProgress.classNetVaultReviewStep, 2);
    assert.equal(rejected.sceneProgress.classNetVaultDocketCarried, 3);
    assert.equal(rejected.documentPoints, current.documentPoints);
    assert.equal(rejected.reliability, current.reliability);
    assert.equal(rejected.playerCombat.weapon.swingId, current.playerCombat.weapon.swingId, "Answer must not start a tool swing");
    assert(!rejected.sceneProgress.classNetVaultReviewComplete);
    await shiftEntry(-1);
    const draft = await checkpoint("correct-draft-not-filed");
    assert.equal(draft.sceneProgress.classNetWithholdingSlot, 2);
    assert(!draft.sceneProgress.classNetVaultReviewComplete);
    assert.equal(draft.documentPoints, current.documentPoints);
    assert.deepEqual(draft.documentCandidates, current.documentCandidates);
    if (rotate) {
      await page.setViewportSize(mobileViewport);
      await page.waitForTimeout(700);
      const restored = await checkpoint("draft-portrait");
      assert.equal(restored.sceneProgress.classNetWithholdingSlot, 2);
      assert.equal(restored.reliability, draft.reliability);
      assert.equal(restored.mode, "choice");
    }
    if (mobile) await tap(228, 54);
    else await page.keyboard.press("Escape", { delay: 200 });
    await page.waitForTimeout(120);
    assert.equal((await state()).mode, "explore");
    assert.equal((await state()).playerCombat.weapon.swingId, current.playerCombat.weapon.swingId);
    await page.reload();
    await page.waitForFunction(() => window.render_game_to_text && JSON.parse(window.render_game_to_text()).scene === "TapToStartScene");
    await press("Enter");
    await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).scene === "NetworkScene");
    await page.waitForTimeout(800);
    current = await checkpoint("unfiled-ledger-restored");
    assert.equal(current.roomTraversal.currentRoomId, "N2");
    assert.equal(current.sceneProgress.classNetVaultReviewStep, 2);
    assert.equal(current.sceneProgress.classNetVaultDocketCarried, 3);
    assert(!current.sceneProgress.classNetVaultReviewComplete);
    assert.equal(current.sceneProgress.classNetWithholdingSlot, 2);
    await press();
    assert.equal((await state()).mode, "choice");
    await shiftEntry(-1);
    await press();
    assert.equal((await state()).sceneProgress.classNetWithholdingSlot, 2,
      "A advances exactly one slot and does not file or swing");
    assert(!(await state()).sceneProgress.classNetVaultReviewComplete);
    await checkpoint("restored-draft-ready-to-file");
    await fileEntry();
    current = await checkpoint("review-room-cleared");
    assert.equal(current.sceneProgress.classNetVaultReviewComplete, 1);
    assert.equal(current.sceneProgress.classNetVaultDocketCarried, 0);
    assert.equal(current.objective, "TAKE CLEARANCE TOKEN");

    await move(128, 164);
    await press();
    current = await checkpoint("clearance-token-earned");
    assert.equal(current.objective, "EXIT EAST - REFERRAL");
    assert(current.inventory.includes("Clearance Token"));

    await move(215, 194);await move(215, 124);await move(248, 124, "ReferralVaultScene");
    current = await checkpoint("referral-entry");
    assert.equal(current.scene, "ReferralVaultScene");

    const metrics = await page.evaluate(() => ({
      mobile: window.rubyRuleMobileMetrics,
      touch: window.rubyRuleTouchControls,
      overflow: document.documentElement.scrollWidth > window.innerWidth
    }));
    await writeFile(`${out}/metrics.json`, JSON.stringify(metrics, null, 2));
    assert.equal(metrics.overflow, false);
    if (mobile) assert.equal(metrics.touch?.enabled, true);
    await context.storageState({path:`${out}/earned-storage.json`});
    assert.deepEqual(errors, []);
  } catch (error) {
    await checkpoint("failure");
    throw error;
  } finally {
    try { await writeFile(`${out}/errors.json`, JSON.stringify(errors, null, 2)); }
    finally { await context.close(); }
  }
}

try {
  const mobile = process.argv.includes("--mobile");
  await run(mobile ? "mobile" : "desktop", mobile);
} finally {
  await browser.close();
}
