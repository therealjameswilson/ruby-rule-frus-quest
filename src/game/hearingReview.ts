import { HAC_HEARING_SOURCE_URL } from "./hacHearing";

export const HEARING_SERIES_SOURCE_URL = "https://history.state.gov/historicaldocuments/frus1989-92v31/abouttheseries";
export type HearingExhibitSide = "left" | "right";
export type HearingReviewAction = HearingExhibitSide | "witness";
export interface HearingReviewState {
  step: number;
  carried: HearingExhibitSide | null;
  placed: boolean;
  complete: boolean;
}

// Fictional exhibits practice the source rules, not an actual Senate/HAC proceeding.
export const HEARING_REVIEWS = [
  {
    id: "sample_gap", title: "SAMPLE THE GAP", request: "Find a record still classified\nafter 30 years.", correct: "left",
    sourceUrl: HAC_HEARING_SOURCE_URL,
    left: { label: "Retention Register", evidence: "1989 cable, reviewed in 2024.\nTwo pages remain classified." },
    right: { label: "Release List", evidence: "1989 records released in full.\nNo classified records listed." },
    failure: "CLEARED FILES MISS THE GAP", success: "SAMPLE RECORDED"
  },
  {
    id: "withheld_entry", title: "KEEP THE MISSING FILE", request: "File 12 remains withheld.\nKeep its place in the record.", correct: "right",
    sourceUrl: HEARING_SERIES_SOURCE_URL,
    left: { label: "Shortened List", evidence: "The list jumps from 11 to 13.\nFile 12 leaves no entry." },
    right: { label: "Withholding Entry", evidence: "12: dated heading + source.\nTwo pages not declassified." },
    failure: "THE MISSING ENTRY MATTERS", success: "WITHHOLDING ACCOUNTED FOR"
  }
] as const;

export function readHearingReview(progress: Readonly<Record<string, number>>): HearingReviewState {
  const complete = Boolean(progress.senateHacReviewComplete);
  // Legacy quiz step 3 already resolved the 30-year sampling question.
  const stored = progress.senateEvidenceStep ?? ((progress.senateHacReviewStep ?? 0) >= 3 ? 1 : 0);
  const step = complete ? HEARING_REVIEWS.length : Math.max(0, Math.min(HEARING_REVIEWS.length - 1, Number.isFinite(stored) ? Math.floor(stored) : 0));
  const carried = complete ? null : progress.senateEvidenceCarried === 1 ? "left" : progress.senateEvidenceCarried === 2 ? "right" : null;
  return { step, carried, complete, placed: Boolean(progress.senateEvidencePlaced) && carried === HEARING_REVIEWS[step]?.correct };
}

export function writeHearingReview(progress: Record<string, number>, state: HearingReviewState) {
  progress.senateEvidenceStep = state.step;
  progress.senateEvidenceCarried = state.carried === "left" ? 1 : state.carried === "right" ? 2 : 0;
  progress.senateEvidencePlaced = state.placed ? 1 : 0;
  if (state.complete) progress.senateHacReviewComplete = 1;
}

export type HearingReviewEvent = "hint" | "picked" | "rejected" | "placed" | "signed" | "completed" | "finished";
export function applyHearingReviewAction(state: HearingReviewState, action: HearingReviewAction): {
  state: HearingReviewState; event: HearingReviewEvent; message: string;
} {
  if (state.complete) return { state, event: "finished", message: "REVIEW ALREADY FILED" };
  const review = HEARING_REVIEWS[state.step];
  if (!review) return { state, event: "hint", message: "CHECK THE REVIEW RECORD" };
  if (action !== "witness") {
    if (state.placed) return { state, event: "hint", message: "SIGN AT THE WITNESS DESK" };
    return { state: { ...state, carried: action }, event: "picked", message: "EXHIBIT IN HAND" };
  }
  if (!state.carried) return { state, event: "hint", message: "COMPARE THE TWO EXHIBITS" };
  if (state.carried !== review.correct) return { state, event: "rejected", message: review.failure };
  if (!state.placed) return { state: { ...state, placed: true }, event: "placed", message: "EVIDENCE FITS - SIGN IT" };
  const step = state.step + 1, complete = step === HEARING_REVIEWS.length;
  return { state: { step, complete, carried: null, placed: false }, event: complete ? "completed" : "signed", message: review.success };
}

export function hearingReviewObjective(state: HearingReviewState, fragmentHeld: boolean) {
  if (state.complete) return fragmentHeld ? "SOUTH TO OFFICE" : "CLAIM TREATY FRAGMENT";
  if (state.placed) return "SIGN THE REVIEW";
  return state.carried ? "FILE AT WITNESS DESK" : `COMPARE EXHIBITS ${state.step + 1}/2`;
}
