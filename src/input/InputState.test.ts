import { afterEach, describe, expect, it } from "vitest";
import {
  getInput,
  setNativeTextEntryActive,
  getPrimaryActionBadge,
  getSecondaryActionBadge,
  isTouchControlPoint,
  updateInputCallbacks,
  pressKeyForTests,
  releaseKeyForTests,
  resetInput,
  setKeyboardDownForTests,
  setNowProviderForTests,
  setTouchControl,
  swallowNextInputFrame,
  TAP_ACTION_HOLD_MS,
  TAP_MOVEMENT_HOLD_MS,
  tapActionForTests,
  tapDirectionForTests,
  tickInput
} from "./InputState";

describe("InputState keyboard edges", () => {
  afterEach(() => {
    setNativeTextEntryActive(false);
    setNowProviderForTests(null);
    resetInput();
    updateInputCallbacks({ isTouchControlPoint: undefined });
  });

  it("suspends all game input during native text entry and swallows dismissal", () => {
    setNativeTextEntryActive(true);
    setKeyboardDownForTests(["KeyZ", "ArrowLeft", "Escape"]);
    setTouchControl("space", true);
    for (let frame = 0; frame < 3; frame++) {
      tickInput();
      expect(getInput().aJustPressed).toBe(false);
      expect(getInput().pauseJustPressed).toBe(false);
      expect(getInput().dir).toEqual({ x: 0, y: 0 });
    }
    setNativeTextEntryActive(false);
    tickInput();
    expect(getInput().aJustPressed).toBe(false);
    expect(getInput().dir).toEqual({ x: 0, y: 0 });
    tickInput();
    pressKeyForTests("KeyZ");
    tickInput();
    expect(getInput().aJustPressed).toBe(true);
  });

  it("maps Z to A and X/B to the secondary action", () => {
    setKeyboardDownForTests(["KeyZ"]);
    tickInput();
    expect(getInput().aJustPressed).toBe(true);
    expect(getInput().confirmJustPressed).toBe(true);
    resetInput();

    setKeyboardDownForTests(["KeyX"]);
    tickInput();
    expect(getInput().bJustPressed).toBe(true);
    resetInput();

    setKeyboardDownForTests(["KeyB"]);
    tickInput();
    expect(getInput().bJustPressed).toBe(true);
  });

  it("latches a short V throw without triggering interaction or pencil", () => {
    tapActionForTests("KeyV"); tickInput();
    expect(getInput().throwItemJustPressed).toBe(true);
    expect(getInput().aJustPressed).toBe(false);
    expect(getInput().bJustPressed).toBe(false);
    tickInput();
    expect(getInput().throwItemJustPressed).toBe(false);
    tapActionForTests("KeyV"); tickInput();
    expect(getInput().throwItemJustPressed).toBe(true);
  });

  it("samples a between-frame direction tap once without a forced hold", () => {
    let now = 1000;
    setNowProviderForTests(() => now);
    // A tap that latches the keydown time but leaves no key physically held,
    // as a cloud/automation browser's synthetic keypress would.
    tapDirectionForTests("ArrowRight");
    tickInput();
    expect(getInput().dir).toEqual({ x: 1, y: 0 });

    // The tap was observed; its safety latch must not add movement on release.
    now += 16;
    tickInput();
    expect(getInput().dir).toEqual({ x: 0, y: 0 });

    // After the hold window elapses, the latch releases and movement stops.
    now += 20;
    tickInput();
    expect(getInput().dir).toEqual({ x: 0, y: 0 });
  });

  it("stops a sampled short key press on release and reverses without stale input", () => {
    let now = 1000;
    setNowProviderForTests(() => now);
    pressKeyForTests("ArrowRight"); tickInput();
    expect(getInput().dir).toEqual({ x: 1, y: 0 });
    now += 16; releaseKeyForTests("ArrowRight"); tickInput();
    expect(getInput().dir).toEqual({ x: 0, y: 0 });
    now += 16; pressKeyForTests("ArrowLeft"); tickInput();
    expect(getInput().dir).toEqual({ x: -1, y: 0 });
  });

  it("stops touch movement immediately and preserves an unsampled touch tap", () => {
    let now = 1000;
    setNowProviderForTests(() => now);
    setTouchControl("right", true); tickInput();
    now += 16; setTouchControl("right", false); tickInput();
    expect(getInput().dir).toEqual({ x: 0, y: 0 });
    setTouchControl("left", true); setTouchControl("left", false);
    now += 16; tickInput();
    expect(getInput().dir).toEqual({ x: -1, y: 0 });
    now += 16; tickInput();
    expect(getInput().dir).toEqual({ x: 0, y: 0 });
  });

  it("keeps WASD taps equivalent to arrow taps", () => {
    let now = 500;
    setNowProviderForTests(() => now);
    tapDirectionForTests("KeyD");
    tickInput();
    const wasd = { ...getInput().dir };
    resetInput();

    now = 500;
    tapDirectionForTests("ArrowRight");
    tickInput();
    expect(getInput().dir).toEqual(wasd);
    expect(getInput().dir).toEqual({ x: 1, y: 0 });
  });

  it("maps arrows and WASD to navigation just-pressed flags", () => {
    setKeyboardDownForTests(["ArrowLeft", "KeyD", "ArrowUp", "KeyS"]);
    tickInput();

    expect(getInput().navLeftJustPressed).toBe(true);
    expect(getInput().navRightJustPressed).toBe(true);
    expect(getInput().navUpJustPressed).toBe(true);
    expect(getInput().navDownJustPressed).toBe(true);
  });

  it("turns too-short arrow and WASD taps into navigation just-pressed edges", () => {
    let now = 1200;
    setNowProviderForTests(() => now);
    tapDirectionForTests("ArrowLeft");
    tapDirectionForTests("KeyW");
    tickInput();
    expect(getInput().navLeftJustPressed).toBe(true);
    expect(getInput().navUpJustPressed).toBe(true);

    now += TAP_MOVEMENT_HOLD_MS - 10;
    tickInput();
    expect(getInput().navLeftJustPressed).toBe(false);
    expect(getInput().navUpJustPressed).toBe(false);
  });

  it("maps touch D-pad presses to one-frame navigation edges", () => {
    setTouchControl("right", true);
    tickInput();
    expect(getInput().navRightJustPressed).toBe(true);
    expect(getInput().dir).toEqual({ x: 1, y: 0 });

    tickInput();
    expect(getInput().navRightJustPressed).toBe(false);

    setTouchControl("right", false);
    setTouchControl("down", true);
    tickInput();
    expect(getInput().navDownJustPressed).toBe(true);
  });

  it.each([
    ["ArrowLeft", "navLeftJustPressed"], ["KeyA", "navLeftJustPressed"],
    ["ArrowRight", "navRightJustPressed"], ["KeyD", "navRightJustPressed"],
    ["ArrowUp", "navUpJustPressed"], ["KeyW", "navUpJustPressed"],
    ["ArrowDown", "navDownJustPressed"], ["KeyS", "navDownJustPressed"]
  ] as const)("re-arms %s menu taps inside the movement hold", (code, edge) => {
    let now = 1000;
    setNowProviderForTests(() => now);
    tapDirectionForTests(code);
    tickInput();
    expect(getInput()[edge]).toBe(true);
    const movement = { ...getInput().dir };
    now += 16;
    tickInput();
    expect(getInput()[edge]).toBe(false);
    now += 24;
    tapDirectionForTests(code);
    tickInput();
    expect(getInput()[edge]).toBe(true);
    expect(getInput().dir).toEqual(movement);
    tickInput();
    expect(getInput()[edge]).toBe(false);
  });

  it("discards pending navigation when an overlay swallows input", () => {
    tapDirectionForTests("ArrowDown");
    swallowNextInputFrame();
    tickInput();
    tickInput();
    expect(getInput().navDownJustPressed).toBe(false);
    tapDirectionForTests("ArrowDown");
    tickInput();
    expect(getInput().navDownJustPressed).toBe(true);
  });

  it("turns a too-short touch A tap into a single interaction edge", () => {
    let now = 3000;
    setNowProviderForTests(() => now);
    setTouchControl("space", true);
    setTouchControl("space", false);

    tickInput();
    expect(getInput().aJustPressed).toBe(true);
    expect(getInput().confirmJustPressed).toBe(true);

    now += TAP_ACTION_HOLD_MS - 10;
    tickInput();
    expect(getInput().aJustPressed).toBe(false);
    expect(getInput().a).toBe(true);

    now += 20;
    tickInput();
    expect(getInput().a).toBe(false);
    expect(getInput().aJustReleased).toBe(true);
  });

  it("maps WASD and arrow keys to the identical movement axis", () => {
    setKeyboardDownForTests(["KeyW"]);
    tickInput();
    const wasdUp = { ...getInput().dir };
    resetInput();

    setKeyboardDownForTests(["ArrowUp"]);
    tickInput();
    expect(getInput().dir).toEqual(wasdUp);
    expect(getInput().dir).toEqual({ x: 0, y: -1 });
    resetInput();

    setKeyboardDownForTests(["KeyD"]);
    tickInput();
    const wasdRight = { ...getInput().dir };
    resetInput();

    setKeyboardDownForTests(["ArrowRight"]);
    tickInput();
    expect(getInput().dir).toEqual(wasdRight);
    expect(getInput().dir).toEqual({ x: 1, y: 0 });
  });

  it("keeps a quick KeyA tap as movement only", () => {
    let now = 1000;
    setNowProviderForTests(() => now);
    pressKeyForTests("KeyA");
    tickInput();
    expect(getInput().dir).toEqual({ x: -1, y: 0 });
    expect(getInput().aJustPressed).toBe(false);

    now += TAP_MOVEMENT_HOLD_MS - 20;
    releaseKeyForTests("KeyA");
    tickInput();
    expect(getInput().aJustPressed).toBe(false);

    tickInput();
    expect(getInput().aJustPressed).toBe(false);
  });

  it("advertises the keyboard action key without overloading WASD", () => {
    expect(getPrimaryActionBadge()).toBe("Z");
    expect(getSecondaryActionBadge()).toBe("X");
  });

  it("lets the live touch overlay reserve its button zones from pause-menu clicks", () => {
    expect(isTouchControlPoint({ x: 174, y: 216 })).toBe(false);
    updateInputCallbacks({ isTouchControlPoint: ({ x, y }) => x === 174 && y === 216 });
    expect(isTouchControlPoint({ x: 174, y: 216 })).toBe(true);
    expect(isTouchControlPoint({ x: 205, y: 182 })).toBe(false);
  });

  it("keeps just-pressed flags true for exactly one tick while held", () => {
    setKeyboardDownForTests(["KeyA", "Enter"]);
    tickInput();
    expect(getInput().navLeftJustPressed).toBe(true);
    expect(getInput().confirmJustPressed).toBe(true);

    tickInput();
    expect(getInput().navLeftJustPressed).toBe(false);
    expect(getInput().confirmJustPressed).toBe(false);
  });

  it("maps Enter and Space to confirm and Escape to cancel", () => {
    setKeyboardDownForTests(["Enter"]);
    tickInput();
    expect(getInput().confirmJustPressed).toBe(true);

    setKeyboardDownForTests(["Space"]);
    tickInput();
    expect(getInput().confirmJustPressed).toBe(true);

    setKeyboardDownForTests(["Escape"]);
    tickInput();
    expect(getInput().cancelJustPressed).toBe(true);
  });

  it("does not fire a pause/cancel edge from a still-held Escape after a swallow", () => {
    // Escape is held when an overlay closes and swallows the next frame.
    setKeyboardDownForTests(["Escape"]);
    swallowNextInputFrame();
    tickInput(); // swallow frame: currentState zeroed
    expect(getInput().pauseJustPressed).toBe(false);
    expect(getInput().cancelJustPressed).toBe(false);

    // Browser key-repeat keeps Escape physically down on subsequent frames.
    pressKeyForTests("Escape");
    tickInput();
    expect(getInput().pauseJustPressed).toBe(false);
    expect(getInput().cancelJustPressed).toBe(false);

    pressKeyForTests("Escape");
    tickInput();
    expect(getInput().pauseJustPressed).toBe(false);
    expect(getInput().cancelJustPressed).toBe(false);
  });

  it("allows a fresh Escape edge after the key is released", () => {
    setKeyboardDownForTests(["Escape"]);
    swallowNextInputFrame();
    tickInput();

    releaseKeyForTests("Escape");
    tickInput();
    expect(getInput().pauseJustPressed).toBe(false);

    pressKeyForTests("Escape");
    tickInput();
    expect(getInput().pauseJustPressed).toBe(true);
    expect(getInput().cancelJustPressed).toBe(true);
  });

  // A too-short A-button tap (keydown+keyup inside one rendered frame, as a
  // cloud/automation browser produces) must still raise a single aJustPressed
  // edge so failed-interaction feedback ("NOTHING TO INTERACT WITH") fires.
  it("turns a too-short A tap into a single aJustPressed edge", () => {
    let now = 1000;
    setNowProviderForTests(() => now);
    tapActionForTests("KeyZ");
    tickInput();
    expect(getInput().aJustPressed).toBe(true);
    expect(getInput().confirmJustPressed).toBe(true);

    // Still latched a frame later (no second edge), then releases.
    now += TAP_ACTION_HOLD_MS - 10;
    tickInput();
    expect(getInput().aJustPressed).toBe(false);
    expect(getInput().a).toBe(true);

    now += 20;
    tickInput();
    expect(getInput().a).toBe(false);
    expect(getInput().aJustReleased).toBe(true);
  });

  it.each([
    ["KeyZ", "aJustPressed"], ["KeyX", "bJustPressed"],
    ["Enter", "confirmJustPressed"], ["Escape", "cancelJustPressed"]
  ] as const)("preserves two distinct %s taps inside the short-tap latch", (code, edge) => {
    let now = 1000;
    setNowProviderForTests(() => now);
    tapActionForTests(code); tickInput();
    expect(getInput()[edge]).toBe(true);
    now += 16; tickInput();
    expect(getInput()[edge]).toBe(false);
    now += 16; tapActionForTests(code); tickInput();
    expect(getInput()[edge]).toBe(true);
    now += 16; tickInput();
    expect(getInput()[edge]).toBe(false);
  });

  it.each([["space", "aJustPressed"], ["b", "bJustPressed"]] as const)("re-arms a fresh touch %s press without repeating a held button", (key, edge) => {
    let now = 1000;
    setNowProviderForTests(() => now);
    setTouchControl(key, true); tickInput();
    expect(getInput()[edge]).toBe(true);
    now += 16; setTouchControl(key, true); tickInput();
    expect(getInput()[edge]).toBe(false);
    setTouchControl(key, false);
    now += 16; setTouchControl(key, true); tickInput();
    expect(getInput()[edge]).toBe(true);
  });

  it("clears queued fresh edges when an overlay swallows input", () => {
    tapActionForTests("KeyZ");
    tapActionForTests("KeyX");
    setTouchControl("space", true);
    setTouchControl("b", true);
    swallowNextInputFrame();
    tickInput(); tickInput();
    expect(getInput().aJustPressed).toBe(false);
    expect(getInput().bJustPressed).toBe(false);
    expect(getInput().confirmJustPressed).toBe(false);
    expect(getInput().cancelJustPressed).toBe(false);
  });

  it("turns a too-short Escape tap into a single pause/cancel edge", () => {
    let now = 2000;
    setNowProviderForTests(() => now);
    tapActionForTests("Escape");
    tickInput();
    expect(getInput().pauseJustPressed).toBe(true);
    expect(getInput().cancelJustPressed).toBe(true);

    now += TAP_ACTION_HOLD_MS + 10;
    tickInput();
    expect(getInput().pause).toBe(false);
  });

  // The ESC suppression latch is normally cleared by the Escape keyup listener.
  // A missed keyup (focus shift on overlay/scene close, or a cloud-automation
  // event) must not leave it stuck true and silently kill every future ESC edge
  // while M/Tab keep working (live audit, 2026-06-15). Once Escape is no longer
  // physically held on a tick, the suppression self-heals.
  it("self-heals the ESC suppression when a keyup is missed", () => {
    // Close an overlay with Escape still held: arms the swallow + suppression.
    setKeyboardDownForTests(["Escape"]);
    swallowNextInputFrame();
    tickInput(); // swallow frame
    expect(getInput().pauseJustPressed).toBe(false);

    // Simulate the missed keyup: the key is no longer physically down, but the
    // Escape keyup listener never ran, so suppressEscEdgesUntilRelease is still
    // armed. A bare tick with no Escape held must release it.
    tickInput();

    // A brand-new Escape press now produces a live edge again.
    pressKeyForTests("Escape");
    tickInput();
    expect(getInput().pauseJustPressed).toBe(true);
    expect(getInput().cancelJustPressed).toBe(true);
  });

  // resetInput() runs on window blur / tab visibility changes. A swallow armed
  // just before blur must not survive the reset, or the first real input frame
  // after refocus would be silently dropped.
  it("clears a pending swallow on resetInput so the next frame is live", () => {
    setKeyboardDownForTests(["Space"]);
    swallowNextInputFrame();
    resetInput();

    pressKeyForTests("Space");
    tickInput();
    expect(getInput().aJustPressed).toBe(true);
  });
});
