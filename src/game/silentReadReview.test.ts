import { describe, expect, it } from "vitest";
import type { ProcessItemId } from "./constants";
import {
  deriveSilentReadReviewStep,
  routeSilentReadReviewItem,
  SILENT_READ_REVIEW_ITEMS,
  SILENT_READ_REVIEW_TOTAL,
  silentReadReviewStatusCode,
  silentReadReviewStatusFromCode
} from "./silentReadReview";

describe("physical Silent Read review", () => {
  it("turns the complete review sequence into eight ordered physical objects", () => {
    expect(SILENT_READ_REVIEW_ITEMS.map((item) => item.id)).toEqual([
      "mechanical-fix",
      "public-crossref",
      "classified-source",
      "referral-equity",
      "proof-date",
      "editorial-ledger",
      "printer-copy",
      "typesetter-proof"
    ]);
    expect(SILENT_READ_REVIEW_ITEMS[0].checkIds.length).toBe(4);
    expect(SILENT_READ_REVIEW_ITEMS[5].checkIds.length).toBe(7);
    expect(SILENT_READ_REVIEW_ITEMS[6].checkIds.length).toBe(4);
    expect(SILENT_READ_REVIEW_ITEMS[7].checkIds.length).toBe(2);
  });

  it("accepts the correct station and rejects wrong or out-of-order filing", () => {
    expect(routeSilentReadReviewItem(0, "mechanical-fix", "editor-desk").ok).toBe(true);
    expect(routeSilentReadReviewItem(5, "editorial-ledger", "proof-table")).toMatchObject({
      ok: false,
      reason: "METHOD LEDGER belongs at consultation-desk."
    });
    expect(routeSilentReadReviewItem(6, "typesetter-proof", "proof-table")).toMatchObject({
      ok: false,
      reason: "Cleared Printer's Copy Sequence must be handled before typesetter-proof."
    });
  });

  it("round-trips the persisted active-object status", () => {
    for (const status of ["waiting", "carried", "routed", "verified"] as const) {
      expect(silentReadReviewStatusFromCode(silentReadReviewStatusCode(status))).toBe(status);
    }
  });

  it("prefers explicit progress and clamps it to the physical sequence", () => {
    const tools = new Set<ProcessItemId>();
    expect(deriveSilentReadReviewStep({ silentReadReviewStep: 3 }, tools)).toBe(3);
    expect(deriveSilentReadReviewStep({ silentReadReviewStep: 99 }, tools)).toBe(SILENT_READ_REVIEW_TOTAL);
    expect(deriveSilentReadReviewStep({ silentReadReviewStep: -4 }, tools)).toBe(0);
  });

  it("translates legacy completion fields into the matching physical step", () => {
    expect(deriveSilentReadReviewStep({ aiAnnotationReviewComplete: 1 }, new Set())).toBe(1);
    expect(deriveSilentReadReviewStep({}, new Set<ProcessItemId>(["proof_lens"]))).toBe(5);
    expect(deriveSilentReadReviewStep({
      editorialMethodologyComplete: 1,
      editorialTreatmentComplete: 1
    }, new Set())).toBe(6);
    expect(deriveSilentReadReviewStep({
      editorialMethodologyComplete: 1,
      editorialTreatmentComplete: 1,
      typeflowOrderComplete: 1,
      typesettingPreparationComplete: 1
    }, new Set())).toBe(7);
    expect(deriveSilentReadReviewStep({}, new Set<ProcessItemId>(["buckram_key"]))).toBe(SILENT_READ_REVIEW_TOTAL);
  });
});
