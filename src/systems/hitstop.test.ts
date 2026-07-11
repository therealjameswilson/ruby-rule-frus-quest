import { describe, expect, it } from "vitest";
import {
  ATTACK_BUFFER_MS,
  AttackBuffer,
  framesToMs,
  HITSTOP_FRAMES,
  HitstopController,
  MAX_HITSTOP_FRAMES,
  MIN_HITSTOP_FRAMES,
  resolveHitstopMs
} from "./hitstop";

describe("framesToMs", () => {
  it("converts frames to milliseconds at 60fps", () => {
    expect(framesToMs(3)).toBeCloseTo(50, 6);
    expect(framesToMs(1, 60)).toBeCloseTo(1000 / 60, 6);
  });

  it("treats negative, zero-fps, and non-finite inputs as no time", () => {
    expect(framesToMs(-4)).toBe(0);
    expect(framesToMs(3, 0)).toBe(0);
    expect(framesToMs(Number.NaN)).toBe(0);
  });
});

describe("resolveHitstopMs", () => {
  it("keeps every configured hit inside the 2-4 frame SNES range", () => {
    for (const frames of Object.values(HITSTOP_FRAMES)) {
      expect(frames).toBeGreaterThanOrEqual(MIN_HITSTOP_FRAMES);
      expect(frames).toBeLessThanOrEqual(MAX_HITSTOP_FRAMES);
    }
  });

  it("gives a heavy hit a longer hold than a normal hit", () => {
    expect(resolveHitstopMs("sword-hit-heavy")).toBeGreaterThan(resolveHitstopMs("sword-hit"));
  });

  it("never exceeds the max frame budget", () => {
    for (const kind of Object.keys(HITSTOP_FRAMES) as (keyof typeof HITSTOP_FRAMES)[]) {
      expect(resolveHitstopMs(kind)).toBeLessThanOrEqual(framesToMs(MAX_HITSTOP_FRAMES));
    }
  });
});

describe("HitstopController", () => {
  it("is not frozen before any hit", () => {
    const hitstop = new HitstopController();
    expect(hitstop.isFrozen(1000)).toBe(false);
    expect(hitstop.remainingMs(1000)).toBe(0);
  });

  it("freezes for the requested window then thaws", () => {
    const hitstop = new HitstopController();
    hitstop.freeze(1000, 50);
    expect(hitstop.isFrozen(1000)).toBe(true);
    expect(hitstop.isFrozen(1049)).toBe(true);
    expect(hitstop.remainingMs(1010)).toBe(40);
    expect(hitstop.isFrozen(1050)).toBe(false);
  });

  it("freezeFor resolves the freeze from a hit kind", () => {
    const hitstop = new HitstopController();
    hitstop.freezeFor(0, "sword-hit");
    expect(hitstop.remainingMs(0)).toBeCloseTo(resolveHitstopMs("sword-hit"), 6);
  });

  it("extends rather than shortens on overlapping hits", () => {
    const hitstop = new HitstopController();
    hitstop.freeze(1000, 60);
    hitstop.freeze(1010, 10); // would end earlier; must not shorten
    expect(hitstop.isFrozen(1055)).toBe(true);
    hitstop.freeze(1040, 100); // extends further out
    expect(hitstop.isFrozen(1130)).toBe(true);
  });

  it("ignores non-finite or non-positive freezes", () => {
    const hitstop = new HitstopController();
    hitstop.freeze(1000, 0);
    hitstop.freeze(1000, -20);
    hitstop.freeze(1000, Number.NaN);
    expect(hitstop.isFrozen(1000)).toBe(false);
  });

  it("reset clears an active freeze", () => {
    const hitstop = new HitstopController();
    hitstop.freeze(1000, 50);
    hitstop.reset();
    expect(hitstop.isFrozen(1000)).toBe(false);
  });
});

describe("AttackBuffer", () => {
  it("fires a press that lands within the grace window", () => {
    const buffer = new AttackBuffer();
    buffer.press(1000);
    expect(buffer.consume(1000 + ATTACK_BUFFER_MS, true)).toBe(true);
  });

  it("only fires once per press", () => {
    const buffer = new AttackBuffer();
    buffer.press(1000);
    expect(buffer.consume(1010, true)).toBe(true);
    expect(buffer.consume(1011, true)).toBe(false);
  });

  it("drops a press that expires before it can act", () => {
    const buffer = new AttackBuffer();
    buffer.press(1000);
    expect(buffer.consume(1000 + ATTACK_BUFFER_MS + 1, true)).toBe(false);
  });

  it("holds the press while the game cannot act, then fires when it can", () => {
    const buffer = new AttackBuffer();
    buffer.press(1000);
    expect(buffer.consume(1030, false)).toBe(false);
    expect(buffer.consume(1040, true)).toBe(true);
  });

  it("clear discards a pending press", () => {
    const buffer = new AttackBuffer();
    buffer.press(1000);
    buffer.clear();
    expect(buffer.consume(1010, true)).toBe(false);
  });
});
