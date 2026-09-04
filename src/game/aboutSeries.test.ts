import { describe, expect, it } from "vitest";
import { ABOUT_SERIES_RULES, ABOUT_SERIES_SOURCE, evaluateIndexReferenceTarget } from "./aboutSeries";

describe("About the Series gameplay source", () => {
  it("points to the exact official volume page requested for the game", () => {
    expect(ABOUT_SERIES_SOURCE).toEqual({
      url: "https://history.state.gov/historicaldocuments/frus1989-92v31/abouttheseries",
      title: "About the Series",
      volume: "1989-1992, Volume XXXI",
      topic: "START I, 1989-1991"
    });
  });

  it("keeps the nine playable rules concise and distinct", () => {
    expect(Object.keys(ABOUT_SERIES_RULES)).toEqual([
      "evidence",
      "coverage",
      "text",
      "chronology",
      "withholding",
      "access",
      "review",
      "index",
      "deadline"
    ]);
    for (const rule of Object.values(ABOUT_SERIES_RULES)) {
      expect(rule.length).toBeGreaterThan(20);
      expect(rule.length).toBeLessThan(150);
    }
  });

  it("preserves the source distinctions the player must learn", () => {
    expect(ABOUT_SERIES_RULES.text).toMatch(/typos.*brackets/i);
    expect(ABOUT_SERIES_RULES.chronology).toMatch(/occurred.*drafting date/i);
    expect(ABOUT_SERIES_RULES.withholding).toMatch(/heading.*source note.*page count/i);
    expect(ABOUT_SERIES_RULES.access).toMatch(/excerpts.*still-classified/i);
    expect(ABOUT_SERIES_RULES.index).toMatch(/document numbers.*page numbers/i);
    expect(ABOUT_SERIES_RULES.deadline).toMatch(/30 years/i);
  });

  it("routes index references to document numbers rather than page numbers", () => {
    expect(evaluateIndexReferenceTarget("page")).toEqual({
      ok: false,
      message: "PAGES MOVE - ROUTE TO DOCUMENT"
    });
    expect(evaluateIndexReferenceTarget("document")).toEqual({
      ok: true,
      message: "INDEX ENTRY 87 -> DOCUMENT 87"
    });
  });
});
