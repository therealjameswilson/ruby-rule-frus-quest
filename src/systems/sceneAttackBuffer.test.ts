import { EventEmitter } from "node:events";
import { describe, expect, it } from "vitest";
import { AttackBuffer } from "./hitstop";
import { installAttackBufferLifecycle } from "./sceneAttackBuffer";

describe("scene attack-buffer lifecycle", () => {
  it.each(["pause", "sleep", "shutdown"])("cancels queued input immediately on %s", event => {
    const events = new EventEmitter(), buffer = new AttackBuffer();
    installAttackBufferLifecycle(events, buffer);
    buffer.press(0);
    events.emit(event);
    expect(buffer.consume(1, true)).toBe(false);
  });
  it("detaches on shutdown and can reinstall without accumulating listeners", () => {
    const events = new EventEmitter(), buffer = new AttackBuffer();
    installAttackBufferLifecycle(events, buffer);
    events.emit("shutdown");
    expect(events.eventNames()).toEqual([]);
    const dispose = installAttackBufferLifecycle(events, buffer);
    expect(events.listenerCount("pause")).toBe(1);
    buffer.press(10);
    expect(buffer.consume(20, true)).toBe(true);
    dispose(); dispose();
    expect(events.eventNames()).toEqual([]);
  });
});
