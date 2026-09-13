import type Phaser from "phaser";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChoicePrompt } from "./verification";
import { bindPointerDown, swallowNextInputFrame } from "../input/InputState";

const controls = vi.hoisted(() => ({ a: false, b: false, aJustPressed: false, bJustPressed: false, cancelJustPressed: false, pauseJustPressed: false, menuJustPressed: false, navDownJustPressed: false, navUpJustPressed: false, choiceAJustPressed: false }));
vi.mock("../input/InputState", () => ({ getInput: () => controls, bindPointerDown: vi.fn(), swallowNextInputFrame: vi.fn() }));
vi.mock("./audio", () => ({ retroAudio: { confirm: vi.fn() } }));
vi.mock("../game/state", () => ({ clearChoiceState: vi.fn(), setChoiceState: vi.fn(), setLatestMessage: vi.fn() }));
vi.mock("phaser", () => ({ default: { Display: { Color: { HexStringToColor: () => ({ color: 0 }) } } } }));

class Visual {
  visible = false;
  setStrokeStyle() { return this; }
  setDepth() { return this; }
  setScrollFactor() { return this; }
  setVisible(visible: boolean) { this.visible = visible; return this; }
  setPosition() { return this; }
  setSize() { return this; }
  setFontSize() { return this; }
  setText() { return this; }
  add() { return this; }
  destroy() {}
}

function fixture(settleMs = 300, onCancel?: () => void) {
  const clock = { now: 1000 };
  const scene = {
    time: clock,
    events: { emit: vi.fn() },
    add: { rectangle: () => new Visual(), text: () => new Visual(), container: () => new Visual() }
  } as unknown as Phaser.Scene;
  const prompt = new ChoicePrompt(scene, { settleMs });
  const callback = vi.fn();
  const show = () => prompt.show("Review interrupted.", [
    { key: "A", label: "Retry", value: "retry" },
    { key: "B", label: "Leave", value: "leave" }
  ], callback, 6, onCancel);
  show();
  return { prompt, callback, clock, show };
}

describe("choice transition input guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(controls, { a: false, b: false, aJustPressed: false, bJustPressed: false, cancelJustPressed: false, pauseJustPressed: false, menuJustPressed: false, navDownJustPressed: false, navUpJustPressed: false, choiceAJustPressed: false });
  });

  it.each(["navDownJustPressed", "navUpJustPressed"] as const)("selects with %s and confirms the highlighted answer", key => {
    const { prompt, callback } = fixture(0);
    controls[key] = true;
    prompt.updateInput();
    expect(callback).not.toHaveBeenCalled();
    controls[key] = false;
    controls.aJustPressed = true;
    prompt.updateInput();
    expect(callback).toHaveBeenCalledWith(expect.objectContaining({ key: "B" }));
  });

  it("keeps direct A shortcuts and resets selection on reopening", () => {
    const { prompt, callback, show } = fixture(0);
    controls.navDownJustPressed = true;
    prompt.updateInput();
    controls.navDownJustPressed = false;
    controls.choiceAJustPressed = true;
    prompt.updateInput();
    expect(callback).toHaveBeenLastCalledWith(expect.objectContaining({ key: "A" }));
    controls.choiceAJustPressed = false;
    show();
    controls.aJustPressed = true;
    prompt.updateInput();
    expect(callback).toHaveBeenLastCalledWith(expect.objectContaining({ key: "A" }));
  });

  it.each(["pauseJustPressed", "menuJustPressed"] as const)("cancels opt-in reviews through %s without submitting B", key => {
    const cancel = vi.fn();
    const { prompt, callback } = fixture(0, cancel);
    controls[key] = true;
    controls.cancelJustPressed = true;
    prompt.updateInput();
    expect(prompt.active).toBe(false);
    expect(callback).not.toHaveBeenCalled();
    expect(cancel).toHaveBeenCalledOnce();
    expect(swallowNextInputFrame).toHaveBeenCalledOnce();
  });

  it("still submits a deliberate B face-button answer in a cancellable review", () => {
    const cancel = vi.fn();
    const { prompt, callback } = fixture(0, cancel);
    controls.bJustPressed = controls.cancelJustPressed = true;
    prompt.updateInput();
    expect(callback).toHaveBeenCalledWith(expect.objectContaining({ key: "B" }));
    expect(cancel).not.toHaveBeenCalled();
  });

  it("does not carry cancellation into another existing choice shown by the same prompt", () => {
    const cancel = vi.fn();
    const { prompt, callback } = fixture(0, cancel);
    prompt.show("Existing choice", [{ key: "B", label: "Leave", value: "leave" }], callback);
    controls.pauseJustPressed = controls.cancelJustPressed = true;
    prompt.updateInput();
    expect(callback).toHaveBeenCalledWith(expect.objectContaining({ key: "B" }));
    expect(cancel).not.toHaveBeenCalled();
  });

  it("does not interpret the combat B edge as an immediate retreat", () => {
    controls.b = controls.bJustPressed = true;
    const { prompt, callback } = fixture();
    prompt.updateInput();
    expect(callback).not.toHaveBeenCalled();
    expect(prompt.active).toBe(true);
  });

  it("requires release after settling, then accepts a fresh deliberate press", () => {
    controls.b = controls.bJustPressed = true;
    const { prompt, callback, clock } = fixture();
    clock.now += 1000;
    prompt.updateInput();
    expect(callback).not.toHaveBeenCalled();
    controls.b = controls.bJustPressed = false;
    prompt.updateInput();
    controls.a = controls.aJustPressed = true;
    prompt.updateInput();
    expect(callback).toHaveBeenCalledWith(expect.objectContaining({ value: "retry" }));
  });

  it("leaves ordinary existing choices immediate", () => {
    controls.b = controls.bJustPressed = true;
    const { prompt, callback } = fixture(0);
    prompt.updateInput();
    expect(callback).toHaveBeenCalledWith(expect.objectContaining({ value: "leave" }));
  });

  it("guards pointer choices too, but allows deliberate retreat after neutral input", () => {
    const { prompt, callback, clock } = fixture();
    const clickLeave = vi.mocked(bindPointerDown).mock.calls[2][1] as () => void;
    clickLeave();
    expect(callback).not.toHaveBeenCalled();
    clock.now += 300;
    prompt.updateInput();
    clickLeave();
    expect(callback).toHaveBeenCalledWith(expect.objectContaining({ value: "leave" }));
  });

  it("rearms the guard every time the prompt is shown", () => {
    const { prompt, callback, clock, show } = fixture();
    clock.now += 300;
    prompt.updateInput();
    prompt.hide();
    show();
    controls.b = controls.bJustPressed = true;
    prompt.updateInput();
    expect(callback).not.toHaveBeenCalled();
  });
});
