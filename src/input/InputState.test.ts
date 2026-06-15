import { afterEach, describe, expect, it } from "vitest";
import {
  getInput,
  pressKeyForTests,
  releaseKeyForTests,
  resetInput,
  setKeyboardDownForTests,
  setNowProviderForTests,
  swallowNextInputFrame,
  TAP_MOVEMENT_HOLD_MS,
  tapDirectionForTests,
  tickInput
} from "./InputState";

describe("InputState keyboard edges", () => {
  afterEach(() => {
    setNowProviderForTests(null);
    resetInput();
  });

  it("maps Z to the A button and X to the B button (SNES emulator faces)", () => {
    setKeyboardDownForTests(["KeyZ"]);
    tickInput();
    expect(getInput().aJustPressed).toBe(true);
    expect(getInput().confirmJustPressed).toBe(true);
    resetInput();

    setKeyboardDownForTests(["KeyX"]);
    tickInput();
    expect(getInput().bJustPressed).toBe(true);
  });

  it("turns a too-short direction tap into a brief visible hold", () => {
    let now = 1000;
    setNowProviderForTests(() => now);
    // A tap that latches the keydown time but leaves no key physically held,
    // as a cloud/automation browser's synthetic keypress would.
    tapDirectionForTests("ArrowRight");
    tickInput();
    expect(getInput().dir).toEqual({ x: 1, y: 0 });

    // Still moving a frame later, inside the hold window.
    now += TAP_MOVEMENT_HOLD_MS - 10;
    tickInput();
    expect(getInput().dir).toEqual({ x: 1, y: 0 });

    // After the hold window elapses, the latch releases and movement stops.
    now += 20;
    tickInput();
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
