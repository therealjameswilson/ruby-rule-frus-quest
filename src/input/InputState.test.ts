import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getInput,
  pressKeyboardForTests,
  resetInput,
  setKeyboardDownForTests,
  setTouchControl,
  swallowNextInputFrame,
  tickInput
} from "./InputState";

describe("InputState keyboard edges", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    resetInput();
  });

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

  it("does not miss a fast key tap that lands between scene ticks", () => {
    pressKeyboardForTests(["Enter", "KeyW"]);
    tickInput();

    expect(getInput().confirmJustPressed).toBe(true);
    expect(getInput().navUpJustPressed).toBe(true);

    tickInput();
    expect(getInput().confirmJustPressed).toBe(false);
    expect(getInput().navUpJustPressed).toBe(false);
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

  it("maps touch D-pad, A, and B controls into shared navigation edges", () => {
    resetInput();
    setTouchControl("left", true);
    setTouchControl("space", true);
    setTouchControl("b", true);
    tickInput();

    expect(getInput().navLeftJustPressed).toBe(true);
    expect(getInput().confirmJustPressed).toBe(true);
    expect(getInput().cancelJustPressed).toBe(true);

    tickInput();
    expect(getInput().navLeftJustPressed).toBe(false);
    expect(getInput().confirmJustPressed).toBe(false);
    expect(getInput().cancelJustPressed).toBe(false);
  });

  it("maps gamepad A and B to confirm and cancel one-frame edges", () => {
    const buttons = Array.from({ length: 16 }, (_, index) => ({ pressed: index === 0 || index === 1 })) as GamepadButton[];
    vi.stubGlobal("navigator", {
      getGamepads: () => [
        {
          axes: [0, 0],
          buttons,
          connected: true,
          id: "test gamepad",
          index: 0
        } as unknown as Gamepad
      ]
    });

    tickInput();
    expect(getInput().confirmJustPressed).toBe(true);
    expect(getInput().cancelJustPressed).toBe(true);

    tickInput();
    expect(getInput().confirmJustPressed).toBe(false);
    expect(getInput().cancelJustPressed).toBe(false);
  });

  it("swallows a resume-dismiss input before it reaches the next scene tick", () => {
    setKeyboardDownForTests(["Enter"]);
    swallowNextInputFrame();

    tickInput();
    expect(getInput().confirmJustPressed).toBe(false);
    expect(getInput().aJustPressed).toBe(false);
  });
});
