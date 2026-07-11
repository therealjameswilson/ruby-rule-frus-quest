import { describe, expect, it } from "vitest";
import { HAC_HEARING_PROMPTS, HAC_HEARING_SOURCE_URL } from "./hacHearing";
import {
  fileCapitolHacPacket,
  HAC_ANNUAL_FINDINGS_ITEM_LABEL,
  HAC_CLOSED_SESSION_POINT_VALUE,
  HAC_PACKET_POINT_VALUE,
  HAC_PROCESS_DOCKET_ITEM_LABEL,
  HAC_THIRTY_YEAR_SAMPLE_ITEM_LABEL,
  inspectClosedSessionSample
} from "./capitolHacPacket";

describe("Capitol Hill HAC packet", () => {
  it("files the witness-table process docket and advances the HAC hearing step", () => {
    const result = fileCapitolHacPacket({ inventory: [], currentStep: 0 });

    expect(result.alreadyFiled).toBe(false);
    expect(result.shouldCompleteHearing).toBe(true);
    expect(result.documentPoints).toBe(HAC_PACKET_POINT_VALUE);
    expect(result.nextStep).toBe(HAC_HEARING_PROMPTS.length);
    expect(result.treatyFragmentIndex).toBe(1);
    expect(result.itemsToAward).toEqual([HAC_PROCESS_DOCKET_ITEM_LABEL, HAC_ANNUAL_FINDINGS_ITEM_LABEL]);
    expect(result.sourceUrl).toBe(HAC_HEARING_SOURCE_URL);
    expect(result.sourceBasis).toContain("30 years");
  });

  it("does not farm points but recovers missing inventory labels on repeat filing", () => {
    const result = fileCapitolHacPacket({
      alreadyFiled: true,
      inventory: [HAC_PROCESS_DOCKET_ITEM_LABEL],
      currentStep: 2
    });

    expect(result.documentPoints).toBe(0);
    expect(result.shouldCompleteHearing).toBe(false);
    expect(result.nextStep).toBe(HAC_HEARING_PROMPTS.length);
    expect(result.itemsToAward).toEqual([HAC_ANNUAL_FINDINGS_ITEM_LABEL]);
    expect(result.message).toContain("already filed");
  });

  it("blocks the closed-session sample until the HAC docket is complete", () => {
    const result = inspectClosedSessionSample({
      hacReviewComplete: false,
      inventory: []
    });

    expect(result.ok).toBe(false);
    expect(result.shouldFileSample).toBe(false);
    expect(result.documentPoints).toBe(0);
    expect(result.message).toContain("witness table");
    expect(result.sourceUrl).toBe(HAC_HEARING_SOURCE_URL);
  });

  it("files a one-time 30-year classified sample after HAC review", () => {
    const result = inspectClosedSessionSample({
      hacReviewComplete: true,
      inventory: []
    });

    expect(result.ok).toBe(true);
    expect(result.shouldFileSample).toBe(true);
    expect(result.documentPoints).toBe(HAC_CLOSED_SESSION_POINT_VALUE);
    expect(result.itemsToAward).toEqual([HAC_THIRTY_YEAR_SAMPLE_ITEM_LABEL]);
    expect(result.objective).toContain("30-year sample");
  });

  it("keeps the closed-session sample repeat-safe", () => {
    const result = inspectClosedSessionSample({
      hacReviewComplete: true,
      alreadyFiled: true,
      inventory: [HAC_THIRTY_YEAR_SAMPLE_ITEM_LABEL]
    });

    expect(result.ok).toBe(true);
    expect(result.shouldFileSample).toBe(false);
    expect(result.documentPoints).toBe(0);
    expect(result.itemsToAward).toEqual([]);
    expect(result.message).toContain("already filed");
  });
});
