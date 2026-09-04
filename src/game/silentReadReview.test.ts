import { describe, expect, it } from "vitest";
import type { ProcessItemId } from "./constants";
import { consumeResumePlayerSpawn, createGameSaveData, gameState, resetGameState, restoreGameSaveData, setSceneState } from "./state";
import {
  deriveSilentReadReviewStep,
  routeSilentReadReviewItem,
  SILENT_READ_REVIEW_ITEMS,
  SILENT_READ_REVIEW_TOTAL,
  silentReadObjective,
  silentReadReviewStatusCode,
  silentReadReviewStatusFromCode,
  silentReadDecision,
  nextSilentReadStatus,
  silentReadResumeRoom
} from "./silentReadReview";

describe("physical Silent Read review", () => {
  it.each([[0, 2, 1], [1, 4, 2]])("round-trips room %i, step %i, status %i through the real save boundary", (room, step, status) => {
    resetGameState();
    setSceneState("SilentReadScene", "explore", "Review the packet");
    Object.assign(gameState.sceneProgress, { silentReadRoom: room, silentReadReviewStep: step, silentReadReviewStatus: status });
    gameState.player = { x: 200, y: 131 };
    gameState.playerFacing = "west";
    gameState.inventory = ["review_folder", "red_pencil"];
    const saved = createGameSaveData();
    resetGameState();
    expect(restoreGameSaveData(saved)).toBe("SilentReadScene");
    expect(silentReadResumeRoom(gameState.sceneProgress, step)).toBe(room === 0 ? "E1" : "S1");
    expect(deriveSilentReadReviewStep(gameState.sceneProgress, new Set())).toBe(step);
    expect(silentReadReviewStatusFromCode(gameState.sceneProgress.silentReadReviewStatus)).toBe(status === 1 ? "carried" : "routed");
    expect(consumeResumePlayerSpawn("SilentReadScene")).toEqual({ player: { x: 200, y: 131 }, facing: "west" });
    expect(gameState.inventory).toEqual(saved.state.inventory);
    expect(gameState.documentCandidates).toEqual(saved.state.documentCandidates);
    resetGameState();
  });
  it("requires visible treatment and an actual source comparison at the two decision desks", () => {
    const bracket = silentReadDecision("mechanical-fix")!;
    const date = silentReadDecision("proof-date")!;
    expect(bracket.options.find((option) => option.key === "B")?.value).toBe(bracket.correctValue);
    expect(date.options.find((option) => option.key === "A")?.value).toBe(date.correctValue);
    for (const decision of [bracket, date]) {
      expect(decision.options.filter((option) => option.value === decision.correctValue)).toHaveLength(1);
      expect(decision.failureMessage.length).toBeLessThanOrEqual(32);
    }
    expect(silentReadDecision("editorial-ledger")).toBeUndefined();
    expect(silentReadDecision("not-a-file")).toBeUndefined();
    expect(silentReadDecision("toString")).toBeUndefined();
  });

  it("keeps the next file in hand across proof desks, including the publication phase", () => {
    expect(nextSilentReadStatus("editor", "evidence")).toBe("waiting");
    expect(nextSilentReadStatus("evidence", "evidence")).toBe("carried");
    expect(nextSilentReadStatus("evidence", "production")).toBe("carried");
    expect(nextSilentReadStatus("production", "production")).toBe("carried");
  });

  it("respects the saved room even when revisiting the editor after earning the pencil", () => {
    expect(silentReadResumeRoom({ silentReadRoom: 0 }, 5)).toBe("E1");
    expect(silentReadResumeRoom({ silentReadRoom: 1 }, 1)).toBe("S1");
    expect(silentReadResumeRoom({}, 0)).toBe("E1");
    expect(silentReadResumeRoom({}, 4)).toBe("S1");
  });
  it("keeps each physical action and its station readable in the HUD", () => {
    for (const item of SILENT_READ_REVIEW_ITEMS) {
      expect(silentReadObjective(item, "waiting")).toBe(`TAKE ${item.shortLabel}`);
      expect(silentReadObjective(item, "carried")).toMatch(/^TO /);
      expect(silentReadObjective(item, "verified")).toMatch(/^STAMP /);
      expect(silentReadObjective(item, "routed")).toMatch(item.kind === "production" ? /^STAMP / : /^(CHECK |ADD VISIBLE BRACKET)/);
      for (const status of ["waiting", "carried", "routed", "verified"] as const) {
        expect(silentReadObjective(item, status).length).toBeLessThanOrEqual(20);
      }
    }
    expect(silentReadObjective(SILENT_READ_REVIEW_ITEMS[0], "routed")).toBe("ADD VISIBLE BRACKET");
    expect(silentReadObjective(SILENT_READ_REVIEW_ITEMS[1], "waiting", false)).toBe("EXIT EAST - PROOF");
    expect(silentReadObjective(null, "stamped")).toBe("EXIT EAST - VAULT");
  });

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
