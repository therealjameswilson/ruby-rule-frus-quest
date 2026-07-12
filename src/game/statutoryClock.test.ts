import { describe, expect, it } from "vitest";
import {
  advanceStatutoryClock,
  getStatutoryClockReadout,
  STATUTORY_BOSS_MS_PER_YEAR,
  STATUTORY_COMPLETION_PRESSURE_YEARS,
  STATUTORY_DEADLINE_YEARS,
  STATUTORY_START_YEAR,
  STATUTORY_SHORTCUT_VIOLATION,
  statutoryCompletionFloor
} from "./statutoryClock";

function readiness(overrides: Partial<Parameters<typeof getStatutoryClockReadout>[0]["readiness"]> = {}) {
  return {
    buckramGateOpen: false,
    completionRatio: 0,
    missingSummary: ["Pendant RULE"],
    ...overrides
  };
}

describe("statutory FRUS clock", () => {
  it("starts at the 20-year access line and runs toward the 30-year publication mandate", () => {
    const readout = getStatutoryClockReadout({
      elapsedYears: STATUTORY_START_YEAR,
      readiness: readiness()
    });

    expect(readout.elapsedYears).toBe(STATUTORY_START_YEAR);
    expect(readout.deadlineYears).toBe(STATUTORY_DEADLINE_YEARS);
    expect(readout.yearsRemaining).toBe(10);
    expect(readout.status).toBe("running");
    expect(readout.sourceUrl).toBe("https://history.state.gov/historicaldocuments/about-frus");
  });

  it("raises the clock floor as production nears final assembly", () => {
    expect(statutoryCompletionFloor(0)).toBe(STATUTORY_START_YEAR);
    expect(statutoryCompletionFloor(1)).toBe(STATUTORY_START_YEAR + STATUTORY_COMPLETION_PRESSURE_YEARS);

    const advanced = advanceStatutoryClock(21, 0, STATUTORY_BOSS_MS_PER_YEAR, readiness({ completionRatio: 1 }));

    expect(advanced).toBe(STATUTORY_START_YEAR + STATUTORY_COMPLETION_PRESSURE_YEARS);
  });

  it("leaves at least eighty active seconds for desktop and touch standard fights", () => {
    const bossStartYear = statutoryCompletionFloor(0.18);
    const activeWindowMs = (STATUTORY_DEADLINE_YEARS - bossStartYear) * STATUTORY_BOSS_MS_PER_YEAR;

    expect(activeWindowMs).toBeGreaterThanOrEqual(80_000);
  });

  it("marks the clock at risk near year 29 while unresolved FRUS gates remain", () => {
    const readout = getStatutoryClockReadout({
      elapsedYears: 29.2,
      readiness: readiness({ completionRatio: 0.9, missingSummary: ["Buckram Key"] })
    });

    expect(readout.status).toBe("at_risk");
    expect(readout.label).toContain("Buckram Key");
    expect(readout.shortcutOffered).toBe(false);
  });

  it("misses the deadline only when the Buckram Gate is still closed", () => {
    const missed = getStatutoryClockReadout({
      elapsedYears: 30,
      readiness: readiness({ missingSummary: ["1 crystal"] })
    });
    const gateOpen = getStatutoryClockReadout({
      elapsedYears: 30,
      readiness: readiness({ buckramGateOpen: true, completionRatio: 1, missingSummary: [] })
    });

    expect(missed.status).toBe("deadline_missed");
    expect(missed.shortcutOffered).toBe(true);
    expect(missed.shortcutViolation).toBe(STATUTORY_SHORTCUT_VIOLATION);
    expect(missed.shortcutViolation).toBe("concealed_policy_defect");
    expect(gateOpen.status).toBe("buckram_gate_open");
    expect(gateOpen.shortcutOffered).toBe(false);
  });

  it("records publication as the clean terminal state", () => {
    const readout = getStatutoryClockReadout({
      elapsedYears: 27.5,
      readiness: readiness({ buckramGateOpen: true, completionRatio: 1, missingSummary: [] }),
      finalGatePublished: true
    });

    expect(readout.status).toBe("published");
    expect(readout.label).toBe("Published within the 30-year mandate");
  });
});
