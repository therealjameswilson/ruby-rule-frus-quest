import { describe, expect, it } from "vitest";
import { NSC_SOURCE_BRIEFING_ITEM_LABEL, NSC_SOURCE_GATE_SOURCE_URL } from "./westWingNsc";
import {
  CHRONOLOGY_BRIEFING_MEMO_ITEM_LABEL,
  fileOvalOfficeBriefing,
  OVAL_OFFICE_BRIEFING_POINT_VALUE,
  POLICY_CONTEXT_NOTE_ITEM_LABEL
} from "./ovalOfficeBriefing";

describe("Oval Office briefing desk", () => {
  it("blocks briefing filing until NSC source coverage is certified", () => {
    const result = fileOvalOfficeBriefing({ inventory: [] });

    expect(result.ok).toBe(false);
    expect(result.documentPoints).toBe(0);
    expect(result.shouldFileBriefing).toBe(false);
    expect(result.sourceUrl).toBe(NSC_SOURCE_GATE_SOURCE_URL);
    expect(result.message).toContain("NSC source coverage");
  });

  it("files a chronology and policy-context briefing after coverage", () => {
    const result = fileOvalOfficeBriefing({
      inventory: [NSC_SOURCE_BRIEFING_ITEM_LABEL]
    });

    expect(result.ok).toBe(true);
    expect(result.shouldFileBriefing).toBe(true);
    expect(result.documentPoints).toBe(OVAL_OFFICE_BRIEFING_POINT_VALUE);
    expect(result.itemsToAward).toEqual([CHRONOLOGY_BRIEFING_MEMO_ITEM_LABEL, POLICY_CONTEXT_NOTE_ITEM_LABEL]);
    expect(result.sourceBasis).toContain("chronology");
  });

  it("keeps repeat filing safe while recovering older save inventory", () => {
    const result = fileOvalOfficeBriefing({
      nscClearance: true,
      alreadyFiled: true,
      inventory: [CHRONOLOGY_BRIEFING_MEMO_ITEM_LABEL]
    });

    expect(result.ok).toBe(true);
    expect(result.shouldFileBriefing).toBe(false);
    expect(result.documentPoints).toBe(0);
    expect(result.itemsToAward).toEqual([POLICY_CONTEXT_NOTE_ITEM_LABEL]);
  });
});
