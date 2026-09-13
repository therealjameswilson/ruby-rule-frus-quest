import { afterEach, describe, expect, it } from "vitest";
import { GUIDE_COUNTER, GuideCounterTraining, getGuideCounterReadout, setGuideCounterReadout } from "./guideCounterTraining";

const player = { x: 96, y: 160 };
function advance(lesson: GuideCounterTraining, ms: number, target = player) {
  for (let t = 0; t < ms; t += 10) lesson.update(Math.min(10, ms - t), target, null);
}
function firedLesson() {
  const lesson = new GuideCounterTraining();
  advance(lesson, GUIDE_COUNTER.retryMs + GUIDE_COUNTER.chargeMs);
  expect(lesson.readout().phase).toBe("incoming");
  return lesson;
}

afterEach(() => setGuideCounterReadout(null));

describe("Guide's live Citation Stamp counter", () => {
  it("locks a visible aim during charge instead of tracking the player's dodge", () => {
    const lesson = new GuideCounterTraining();
    advance(lesson, GUIDE_COUNTER.retryMs);
    expect(lesson.readout()).toMatchObject({ phase: "charging", target: player, bolt: null, attempts: 0 });
    advance(lesson, GUIDE_COUNTER.chargeMs, { x: 210, y: 170 });
    expect(lesson.readout()).toMatchObject({ phase: "incoming", target: player, attempts: 1 });
    advance(lesson, 100, { x: 210, y: 170 });
    expect(lesson.readout().bolt!.x).toBeLessThan(GUIDE_COUNTER.source.x);
  });

  it("does not clear a static seal just because the player swings at the source", () => {
    const lesson = new GuideCounterTraining();
    expect(lesson.update(16, player, { ...GUIDE_COUNTER.source, width: 24, height: 28 })).toBeNull();
    expect(lesson.readout().phase).toBe("ready");
  });

  it("moves an incoming bolt on subpixels but reports integer render positions", () => {
    const lesson = firedLesson();
    advance(lesson, 160);
    const bolt = lesson.readout().bolt!;
    expect(bolt.x).toBeLessThan(GUIDE_COUNTER.source.x);
    expect(Number.isInteger(bolt.x) && Number.isInteger(bolt.y)).toBe(true);
    expect(bolt.returned).toBe(false);
  });

  it("requires overlap with the active swing", () => {
    const lesson = firedLesson();
    expect(lesson.update(16, player, { x: 20, y: 20, width: 20, height: 20 })).toBeNull();
    expect(lesson.readout().phase).toBe("incoming");
  });

  it("returns a bolt, then waits for it to reach the source before completing", () => {
    const lesson = firedLesson();
    advance(lesson, 900);
    const bolt = lesson.readout().bolt!;
    expect(lesson.update(16, player, { x: bolt.x - 8, y: bolt.y - 8, width: 16, height: 16 })).toBe("return");
    expect(lesson.readout()).toMatchObject({ phase: "returned", bolt: { returned: true } });
    let completions = 0;
    for (let t = 0; t < 2000; t += 10) if (lesson.update(10, player, null) === "complete") completions += 1;
    expect(completions).toBe(1);
    expect(lesson.readout()).toMatchObject({ phase: "complete", bolt: null });
    expect(lesson.update(50, player, null)).toBeNull();
  });

  it("gives the stamp priority over simultaneous player contact", () => {
    const lesson = firedLesson();
    const bolt = lesson.readout().bolt!;
    expect(lesson.update(0, bolt, { x: bolt.x - 8, y: bolt.y - 8, width: 16, height: 16 })).toBe("return");
  });

  it("retries a missed bolt without health or currency costs", () => {
    const lesson = firedLesson();
    const bolt = lesson.readout().bolt!;
    expect(lesson.update(0, bolt, null)).toBe("miss");
    expect(lesson.readout()).toMatchObject({ phase: "ready", bolt: null, harmless: true, attempts: 1 });
    advance(lesson, GUIDE_COUNTER.retryMs + GUIDE_COUNTER.chargeMs);
    expect(lesson.readout()).toMatchObject({ phase: "incoming", attempts: 2 });
  });

  it("retries when a dodged bolt leaves the room or expires", () => {
    const lesson = firedLesson();
    let missed = false;
    for (let t = 0; t < 6000; t += 10) {
      if (lesson.update(10, { x: 210, y: 180 }, null) === "miss") { missed = true; break; }
    }
    expect(missed).toBe(true);
    expect(lesson.readout().phase).toBe("ready");
  });

  it.each(["charging", "incoming", "returned"])("freezes %s during menus or interruptions", (phase) => {
    const lesson = new GuideCounterTraining();
    advance(lesson, GUIDE_COUNTER.retryMs);
    if (phase !== "charging") advance(lesson, GUIDE_COUNTER.chargeMs + 700);
    if (phase === "returned") {
      const bolt = lesson.readout().bolt!;
      lesson.update(0, player, { x: bolt.x - 8, y: bolt.y - 8, width: 16, height: 16 });
    }
    const before = lesson.readout();
    for (let i = 0; i < 60; i++) lesson.update(50, player, null, true);
    expect(lesson.readout()).toEqual(before);
  });

  it("caps a delayed frame instead of jumping a projectile across the room", () => {
    const lesson = firedLesson();
    const before = lesson.readout().bolt!;
    lesson.update(10000, player, null);
    const after = lesson.readout().bolt!;
    expect(Math.hypot(after.x - before.x, after.y - before.y)).toBeLessThan(4);
  });

  it("clears its transient QA state without adding anything to the save schema", () => {
    setGuideCounterReadout(firedLesson().readout());
    expect(getGuideCounterReadout()?.phase).toBe("incoming");
    setGuideCounterReadout(null);
    expect(getGuideCounterReadout()).toBeNull();
  });
});
