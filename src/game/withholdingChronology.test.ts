import { afterEach, describe, expect, it } from "vitest";
import { ABOUT_SERIES_SOURCE } from "./aboutSeries";
import { deriveClassNetVaultStep, routeClassNetVaultDocket } from "./classNetVaultReview";
import { createGameSaveData, gameState, resetGameState, restoreGameSaveData, setSceneState } from "./state";
import { WITHHOLDING_EVIDENCE, WITHHOLDING_RECORDS, restoreWithholdingSlot,
  shiftWithholdingSlot, validateWithholdingEntry, withholdingSequence, type WithholdingSlot } from "./withholdingChronology";
import { pixelFontMetrics } from "../systems/pixelFontMetrics";

describe("withheld-record chronology", () => {
  afterEach(() => resetGameState());

  it("keeps an omitted document's entry missing until the player inserts it", () => {
    expect(withholdingSequence(0).map(record => record.id)).toEqual(["cable", "telegram"]);
    expect(validateWithholdingEntry(0)).toEqual({ ok: false, message: "KEEP A WITHHOLDING ENTRY" });
  });

  it.each([1, 2, 3] as const)("preserves each record exactly once in occupied slot %s", slot => {
    const sequence = withholdingSequence(slot);
    expect(sequence).toHaveLength(3);
    expect(new Set(sequence.map(record => record.id)).size).toBe(3);
    expect(sequence[slot - 1]).toBe(WITHHOLDING_RECORDS.memcon);
    expect(sequence.filter(record => record.id !== "memcon")).toEqual([
      WITHHOLDING_RECORDS.cable, WITHHOLDING_RECORDS.telegram
    ]);
  });

  it("orders the memcon by conversation time, not its next-day drafting date", () => {
    expect(WITHHOLDING_EVIDENCE.drafted).toBe("DRAFTED: 4 JUN 09:00");
    expect(withholdingSequence(2).map(record => record.time)).toEqual(["09:00", "11:00", "15:00"]);
    expect(validateWithholdingEntry(2).ok).toBe(true);
    for (const slot of [1, 3]) {
      expect(validateWithholdingEntry(slot)).toEqual({ ok: false,
        message: "USE THE CONVERSATION TIME\nNOT THE DRAFT DATE" });
    }
  });

  it("moves the entry both ways with bounded slots and no implicit filing", () => {
    let slot: WithholdingSlot = 0;
    for (const expected of [1, 2, 3, 3]) {
      slot = shiftWithholdingSlot(slot, 1);
      expect(slot).toBe(expected);
    }
    for (const expected of [2, 1, 0, 0]) {
      slot = shiftWithholdingSlot(slot, -1);
      expect(slot).toBe(expected);
    }
    expect(routeClassNetVaultDocket(2, "decision_trail", "decision_ledger").status).toBe("review-required");
  });

  it.each([undefined, -1, 4, 2.1, NaN, Infinity])("restores invalid draft %s as missing, not approved", value => {
    expect(restoreWithholdingSlot(value)).toBe(0);
    expect(validateWithholdingEntry(restoreWithholdingSlot(value)).ok).toBe(false);
  });

  it.each([0, 1, 2, 3])("round-trips unfinished slot %s through the real save boundary without credit", slot => {
    resetGameState();
    setSceneState("NetworkScene", "explore", "3/3 TO LEDGER");
    Object.assign(gameState.sceneProgress, { classNetVaultReviewStep: 2,
      classNetVaultDocketCarried: 3, classNetWithholdingSlot: slot });
    const saved = createGameSaveData();
    resetGameState();
    expect(restoreGameSaveData(saved)).toBe("NetworkScene");
    expect(restoreWithholdingSlot(gameState.sceneProgress.classNetWithholdingSlot)).toBe(slot);
    expect(deriveClassNetVaultStep(gameState.sceneProgress)).toBe(2);
    expect(gameState.sceneProgress.classNetVaultDocketCarried).toBe(3);
    expect(gameState.sceneProgress.classNetVaultReviewComplete).toBeUndefined();
    expect(gameState.documentCandidates).toEqual(saved.state.documentCandidates);
    expect(gameState.inventory).toEqual(saved.state.inventory);
    expect(gameState.documentPoints).toBe(saved.state.documentPoints);
    expect(gameState.reliability).toBe(saved.state.reliability);
  });

  it("does not reopen a completed old save that has no draft slot", () => {
    resetGameState();
    setSceneState("NetworkScene", "explore", "EXIT EAST - REFERRAL");
    gameState.sceneProgress.declassificationReviewComplete = 1;
    const saved = createGameSaveData();
    resetGameState();
    restoreGameSaveData(saved);
    expect(gameState.sceneProgress.classNetWithholdingSlot).toBeUndefined();
    expect(deriveClassNetVaultStep(gameState.sceneProgress)).toBe(3);
  });

  it("retains the source note, page count and source attribution with readable native text", () => {
    expect(WITHHOLDING_EVIDENCE.sourceUrl).toBe(ABOUT_SERIES_SOURCE.url);
    expect(WITHHOLDING_EVIDENCE.sourceNote).toBe("SOURCE: TRAINING FILE A");
    expect(WITHHOLDING_EVIDENCE.pages).toBe("3 PAGES NOT DECLASSIFIED");
    for (const line of [WITHHOLDING_EVIDENCE.heading, WITHHOLDING_EVIDENCE.drafted,
      WITHHOLDING_EVIDENCE.sourceNote, WITHHOLDING_EVIDENCE.pages]) {
      expect(20 + line.length * pixelFontMetrics(8).advance).toBeLessThan(206);
    }
    for (const record of Object.values(WITHHOLDING_RECORDS)) {
      for (const line of [record.label, record.date, record.time]) {
        expect(line.length * pixelFontMetrics(8).advance).toBeLessThan(68);
      }
    }
  });
});
