import { afterEach, describe, expect, it } from "vitest";
import {
  getInput,
  pressKeyForTests,
  releaseKeyForTests,
  resetInput,
  setKeyboardDownForTests,
  swallowNextInputFrame,
  tickInput
} from "./InputState";

describe("InputState keyboard edges", () => {
  afterEach(() => resetInput());

  it("maps arrows and WASD to navigation just-pressed flags", () => {
    setKeyboardDownForTests(["ArrowLeft", "KeyD", "ArrowUp", "KeyS"]);
    tickInput();

    expect(getInput().navLeftJustPressed).toBe(true);
    expect(getInput().navRightJustPressed).toBe(true);
    expect(getInput().navUpJustPressed).toBe(true);
    expect(getInput().navDownJustPressed).toBe(true);
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
