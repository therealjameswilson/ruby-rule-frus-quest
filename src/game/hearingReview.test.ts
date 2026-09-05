import { describe, expect, it } from "vitest";
import { applyHearingReviewAction, HEARING_REVIEWS, hearingReviewObjective, readHearingReview, writeHearingReview } from "./hearingReview";

describe("physical hearing exhibits", () => {
  it("requires a carried exhibit and leaves a wrong sample unfiled", () => {
    const start = readHearingReview({});
    expect(applyHearingReviewAction(start, "witness")).toMatchObject({ state: start, event: "hint" });
    const wrong = applyHearingReviewAction(start, "right").state;
    const rejected = applyHearingReviewAction(wrong, "witness");
    expect(rejected.state).toBe(wrong);
    expect(rejected.event).toBe("rejected");
    expect(rejected.message).toBe(HEARING_REVIEWS[0].failure);
  });

  it("can swap evidence, but requires separate placement and human signature", () => {
    let state = applyHearingReviewAction(readHearingReview({}), "right").state;
    state = applyHearingReviewAction(state, "left").state;
    expect(hearingReviewObjective(state, false)).toBe("FILE AT WITNESS DESK");
    state = applyHearingReviewAction(state, "witness").state;
    expect(state).toMatchObject({ step: 0, placed: true, complete: false });
    expect(hearingReviewObjective(state, false)).toBe("SIGN THE REVIEW");
    expect(applyHearingReviewAction(state, "right").state).toBe(state);
    state = applyHearingReviewAction(state, "witness").state;
    expect(state).toEqual({ step: 1, placed: false, carried: null, complete: false });
  });

  it("preserves the withheld entry before completing; the reward is a separate action", () => {
    let state = readHearingReview({});
    for (const side of ["left", "right"] as const) {
      state = applyHearingReviewAction(state, side).state;
      state = applyHearingReviewAction(state, "witness").state;
      state = applyHearingReviewAction(state, "witness").state;
    }
    expect(state).toEqual({ step: 2, placed: false, carried: null, complete: true });
    expect(applyHearingReviewAction(state, "witness")).toMatchObject({ state, event: "finished" });
    expect(hearingReviewObjective(state, false)).toBe("CLAIM TREATY FRAGMENT");
    expect(hearingReviewObjective(state, true)).toBe("SOUTH TO OFFICE");
  });

  it("rejects a shortened list in the second review", () => {
    const state = readHearingReview({ senateEvidenceStep: 1, senateEvidenceCarried: 1 });
    expect(applyHearingReviewAction(state, "witness").message).toBe(HEARING_REVIEWS[1].failure);
  });

  it("round-trips carried and placed evidence without new save fields", () => {
    for (const placed of [false, true]) {
      const state = { step: 1, carried: "right" as const, placed, complete: false };
      const progress = { unrelatedQuest: 7 };
      writeHearingReview(progress, state);
      expect(readHearingReview(JSON.parse(JSON.stringify(progress)))).toEqual(state);
      expect(progress.unrelatedQuest).toBe(7);
    }
  });

  it("keeps legacy completion and earned sampling progress without replay", () => {
    expect(readHearingReview({ senateHacReviewComplete: 1 }).complete).toBe(true);
    expect(readHearingReview({ senateHacReviewStep: 2 }).step).toBe(0);
    expect(readHearingReview({ senateHacReviewStep: 3 }).step).toBe(1);
    expect(readHearingReview({ senateHacReviewStep: 5, senateEvidenceStep: 0 }).step).toBe(0);
  });

  it("normalizes malformed or stale placed evidence without unlocking completion", () => {
    for (const step of [NaN, Infinity, -1, 9, 0.7]) {
      expect(readHearingReview({ senateEvidenceStep: step }).complete).toBe(false);
    }
    expect(readHearingReview({ senateEvidenceCarried: 2, senateEvidencePlaced: 1 }).placed).toBe(false);
    expect(readHearingReview({ senateEvidenceCarried: 99 }).carried).toBeNull();
    expect(readHearingReview({ senateHacReviewComplete: 1, senateEvidenceCarried: 1, senateEvidencePlaced: 1 }).placed).toBe(false);
  });
});
