import { describe, expect, it } from "vitest";
import {
  ABOUT_SERIES_FIRST_FOOTNOTE_FIELDS,
  ABOUT_SERIES_FIRST_FOOTNOTE_RULE,
  ABOUT_SERIES_HANDBOOK_PAGES,
  ABOUT_SERIES_RULES,
  ABOUT_SERIES_SOURCE,
  ABOUT_SERIES_VOLUME_REVIEW,
  evaluateIndexReferenceTarget,
  getAboutSeriesGameplayReadout
} from "./aboutSeries";
import { wrapChoiceText } from "../systems/choiceLayout";
import { createGameSaveData, gameState, resetGameState, restoreGameSaveData, setSceneState } from "./state";

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

  it("records the complete first-footnote packet from the editorial methodology", () => {
    expect(ABOUT_SERIES_FIRST_FOOTNOTE_FIELDS).toEqual([
      "source",
      "original classification",
      "distribution",
      "drafting information",
      "policy background",
      "reader evidence"
    ]);
    expect(ABOUT_SERIES_FIRST_FOOTNOTE_RULE).toMatch(/source.*classification.*distribution.*drafting.*background.*read/i);
  });

  it("keeps the volume-specific declassification tally available to gameplay", () => {
    expect(ABOUT_SERIES_VOLUME_REVIEW).toEqual({
      authority: "Executive Order 13526",
      startedYear: 2017,
      completedYear: 2024,
      withheldInFull: 1,
      paragraphOrMoreExcisions: 7,
      minorExcisions: 26
    });
    expect(getAboutSeriesGameplayReadout({ aboutSeriesFirstFootnoteComplete: 1 }).firstFootnote.complete).toBe(true);
    expect(getAboutSeriesGameplayReadout({}).declassificationReview.withheldInFull).toBe(1);
  });

  it("fits every handbook page above its navigation controls without truncation", () => {
    for (const page of ABOUT_SERIES_HANDBOOK_PAGES) {
      expect(page.title.length).toBeLessThanOrEqual(23);
      const wrapped = wrapChoiceText(page.text, 31, 5);
      expect(wrapped.replace(/\n/g, " ")).toBe(page.text);
    }
  });

  it.each([false, true])("preserves earned progress without inventing new review credit: %s", (reviewed) => {
    resetGameState();
    setSceneState("ArchiveScene", "explore", "Stamp source note");
    Object.assign(gameState.sceneProgress, { sourceNoteProvenanceComplete: 1, sourceNoteProvenanceStep: 3 });
    if (reviewed) gameState.sceneProgress.aboutSeriesFirstFootnoteComplete = 1;
    const saved = createGameSaveData();
    resetGameState();
    expect(restoreGameSaveData(saved)).toBe("ArchiveScene");
    expect(gameState.sceneProgress.sourceNoteProvenanceComplete).toBe(1);
    expect(getAboutSeriesGameplayReadout(gameState.sceneProgress).firstFootnote).toMatchObject({
      complete: reviewed, status: reviewed ? "verified" : "legacy-credit"
    });
    expect(gameState.documentPoints).toBe(saved.state.documentPoints);
    expect(gameState.inventory).toEqual(saved.state.inventory);
    resetGameState();
  });

  it("does not credit an incomplete source trail", () => {
    expect(getAboutSeriesGameplayReadout({ sourceNoteProvenanceStep: 2 }).firstFootnote)
      .toMatchObject({ complete: false, status: "pending" });
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
