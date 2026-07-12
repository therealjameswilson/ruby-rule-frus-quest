import type { StandardViolation } from "../systems/standardsDamage";

export const STATUTORY_CLOCK_SOURCE_URL = "https://history.state.gov/historicaldocuments/about-frus";
export const STATUTORY_DEADLINE_YEARS = 30;
export const STATUTORY_START_YEAR = 20;
export const STATUTORY_COMPLETION_PRESSURE_YEARS = 8.5;
export const STATUTORY_AT_RISK_YEAR = 29;
// The mandatory three-phase fight needs a fair read-dodge-counter window.
// Roughly 85 active seconds remain from the boss's 21.5-year readiness floor;
// menus and cutscenes pause the clock.
export const STATUTORY_BOSS_MS_PER_YEAR = 10_000;
export const STATUTORY_QUICK_BOSS_MS_PER_YEAR = 700;
export const STATUTORY_SHORTCUT_VIOLATION: StandardViolation = "concealed_policy_defect";

export type StatutoryClockStatus =
  | "running"
  | "at_risk"
  | "deadline_missed"
  | "buckram_gate_open"
  | "published";

export interface StatutoryReadinessLike {
  buckramGateOpen: boolean;
  completionRatio: number;
  missingSummary: readonly string[];
}

export interface StatutoryClockInput {
  elapsedYears: number;
  readiness: StatutoryReadinessLike;
  finalGatePublished?: boolean;
  deadlineDamageApplied?: boolean;
}

export interface StatutoryClockReadout {
  sourceBasis: string;
  sourceUrl: string;
  elapsedYears: number;
  deadlineYears: number;
  yearsRemaining: number;
  completionRatio: number;
  progressRatio: number;
  status: StatutoryClockStatus;
  label: string;
  missingSummary: string[];
  shortcutOffered: boolean;
  shortcutViolation: StandardViolation | null;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function statutoryCompletionFloor(completionRatio: number) {
  return STATUTORY_START_YEAR
    + clamp(completionRatio, 0, 1) * STATUTORY_COMPLETION_PRESSURE_YEARS;
}

export function advanceStatutoryClock(
  elapsedYears: number,
  deltaMs: number,
  msPerYear: number,
  readiness: StatutoryReadinessLike
) {
  const floor = statutoryCompletionFloor(readiness.completionRatio);
  const increment = readiness.buckramGateOpen || msPerYear <= 0
    ? 0
    : Math.max(0, deltaMs) / msPerYear;
  return clamp(Math.max(elapsedYears, floor) + increment, STATUTORY_START_YEAR, STATUTORY_DEADLINE_YEARS);
}

export function getStatutoryClockReadout(input: StatutoryClockInput): StatutoryClockReadout {
  const elapsedYears = clamp(
    Math.max(input.elapsedYears, statutoryCompletionFloor(input.readiness.completionRatio)),
    STATUTORY_START_YEAR,
    STATUTORY_DEADLINE_YEARS
  );
  const yearsRemaining = Math.max(0, STATUTORY_DEADLINE_YEARS - elapsedYears);
  const missingSummary = [...input.readiness.missingSummary];
  const deadlineMissed = elapsedYears >= STATUTORY_DEADLINE_YEARS && !input.readiness.buckramGateOpen;
  const status: StatutoryClockStatus = input.finalGatePublished
    ? "published"
    : input.readiness.buckramGateOpen
      ? "buckram_gate_open"
      : deadlineMissed || input.deadlineDamageApplied
        ? "deadline_missed"
        : elapsedYears >= STATUTORY_AT_RISK_YEAR
          ? "at_risk"
          : "running";
  const suffix = missingSummary.length ? `; missing ${missingSummary.join(", ")}` : "";
  const label = status === "published"
    ? "Published within the 30-year mandate"
    : status === "buckram_gate_open"
      ? `Buckram Gate open at ${elapsedYears.toFixed(1)} / 30 years`
      : status === "deadline_missed"
        ? `30-year deadline missed${suffix}`
        : status === "at_risk"
          ? `Statutory Clock at risk: ${elapsedYears.toFixed(1)} / 30 years${suffix}`
          : `Statutory Clock running: ${elapsedYears.toFixed(1)} / 30 years${suffix}`;

  return {
    sourceBasis: "FRUS statute mandates publication of volumes 30 years after the events they document.",
    sourceUrl: STATUTORY_CLOCK_SOURCE_URL,
    elapsedYears,
    deadlineYears: STATUTORY_DEADLINE_YEARS,
    yearsRemaining,
    completionRatio: clamp(input.readiness.completionRatio, 0, 1),
    progressRatio: elapsedYears / STATUTORY_DEADLINE_YEARS,
    status,
    label,
    missingSummary,
    shortcutOffered: status === "deadline_missed",
    shortcutViolation: status === "deadline_missed" ? STATUTORY_SHORTCUT_VIOLATION : null
  };
}
