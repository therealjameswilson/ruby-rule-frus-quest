import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installResumeInput } from "./resumeInput";

describe("resume gesture shield", () => {
  let target: EventTarget;
  let waiting: boolean;
  let dispose: () => void;
  const resume = vi.fn();
  function send(type: string, properties: object = {}) {
    const event = Object.assign(new Event(type, { cancelable: true }), properties);
    target.dispatchEvent(event);
    return event;
  }
  beforeEach(() => {
    target = new EventTarget();
    vi.stubGlobal("window", target);
    waiting = true;
    resume.mockReset().mockImplementation(() => { waiting = false; });
    dispose = installResumeInput(() => waiting, resume);
  });
  afterEach(() => { dispose(); vi.unstubAllGlobals(); });

  it("keeps the shield until release and swallows the touch/compatibility stream", () => {
    expect(send("pointerdown", { pointerId: 1 }).defaultPrevented).toBe(true);
    expect(waiting).toBe(true);
    expect(send("touchstart").defaultPrevented).toBe(true);
    expect(resume).not.toHaveBeenCalled();
    expect(send("pointerup", { pointerId: 1 }).defaultPrevented).toBe(true);
    expect(resume).toHaveBeenCalledTimes(1);
    for (const type of ["touchend", "mousedown", "mouseup", "click"]) {
      expect(send(type).defaultPrevented).toBe(true);
    }
    expect(resume).toHaveBeenCalledTimes(1);
    expect(send("pointerdown", { pointerId: 2 }).defaultPrevented).toBe(false);
    expect(send("touchstart").defaultPrevented).toBe(false);
    expect(send("click").defaultPrevented).toBe(false);
  });

  it("cancels a drag without resuming or releasing another pointer", () => {
    send("pointerdown", { pointerId: 1 });
    send("pointerup", { pointerId: 2 });
    expect(waiting).toBe(true);
    send("pointercancel", { pointerId: 1 });
    send("pointerup", { pointerId: 1 });
    expect(resume).not.toHaveBeenCalled();
    send("pointerdown", { pointerId: 3 });
    send("pointerup", { pointerId: 3 });
    expect(resume).toHaveBeenCalledTimes(1);
  });

  it("resumes on a key press but swallows repeats until release", () => {
    expect(send("keydown", { code: "Space" }).defaultPrevented).toBe(true);
    expect(resume).toHaveBeenCalledTimes(1);
    expect(send("keydown", { code: "Space", repeat: true }).defaultPrevented).toBe(true);
    expect(send("keyup", { code: "Space" }).defaultPrevented).toBe(true);
    expect(send("keydown", { code: "Space" }).defaultPrevented).toBe(false);
  });

  it("accepts an assistive click once, without requiring a pointer", () => {
    expect(send("click").defaultPrevented).toBe(true);
    expect(resume).toHaveBeenCalledTimes(1);
  });

  it("leaves ordinary gameplay input and disposed listeners alone", () => {
    waiting = false;
    for (const type of ["pointerdown", "pointerup", "touchstart", "click", "keydown"]) {
      expect(send(type, { pointerId: 1, code: "KeyZ" }).defaultPrevented).toBe(false);
    }
    waiting = true;
    dispose();
    expect(send("pointerdown", { pointerId: 1 }).defaultPrevented).toBe(false);
    expect(resume).not.toHaveBeenCalled();
  });
});
