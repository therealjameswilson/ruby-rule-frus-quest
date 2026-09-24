import { describe, expect, it } from "vitest";
import { ORIGINAL_SCORE, scoreEventsAtStep } from "./originalScore";

describe("original score scheduling", () => {
  it("produces bounded, finite events over complete phrases and their loop boundary", () => {
    for (const theme of new Set(Object.values(ORIGINAL_SCORE))) {
      for (let step = 0; step <= theme.notes.length; step++) {
        const events = scoreEventsAtStep(theme, step);
        expect(events.length).toBeLessThanOrEqual(5);
        for (const event of events) {
          expect(Number.isFinite(event.note)).toBe(true);
          expect(event.note).toBeGreaterThanOrEqual(24);
          expect(event.note).toBeLessThanOrEqual(96);
          expect(event.duration).toBeGreaterThan(0);
          expect(event.volume).toBeGreaterThan(0);
          expect(event.volume).toBeLessThanOrEqual(.04);
          expect(event.offset).toBeGreaterThanOrEqual(0);
        }
      }
      expect(scoreEventsAtStep(theme, theme.notes.length)).toEqual(scoreEventsAtStep(theme, 0));
    }
  });
  it("leaves the opening and cadence spacious while adding an answering counterline", () => {
    const theme = ORIGINAL_SCORE.officeHub;
    const hasCounter = (step: number) => scoreEventsAtStep(theme, step).some(event => event.part === "counter");
    expect(hasCounter(1)).toBe(false);
    expect(hasCounter(33)).toBe(true);
    expect(hasCounter(97)).toBe(false);
    expect(theme.notes.slice(-6)).toEqual([null, null, null, null, null, null]);
  });
});
