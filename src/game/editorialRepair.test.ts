import { beforeEach, describe, expect, it } from "vitest";
import { cloneDocumentCandidate, cloneInitialDocumentCandidates } from "./documentWorkflow";
import { EDITORIAL_REPAIR_RECORDS, editorialRepairDraftMatches, nextEditorialRepair, tryEditorialRepair } from "./editorialRepair";
import { addProcessItem, createGameSaveData, gameState, markDocumentUndisclosedDeletion, recordStandardsViolation, repairEditorialRecord, resetGameState, restoreGameSaveData } from "./state";
import type { ProcessItemId } from "./constants";

const tools = new Set<ProcessItemId>(["red_pencil", "proof_lens"]);
const candidate = (id = "source_note_047") => ({
  ...cloneInitialDocumentCandidates().find(document => document.id === id)!,
  workflowState: "proofed" as const, selected: true, citationComplete: true, annotationNeeded: true, undisclosedDeletion: true
});
beforeEach(() => resetGameState());

describe("retained-evidence editorial repairs", () => {
  it.each(EDITORIAL_REPAIR_RECORDS)("repairs $documentId through separate draft and proof actions", record => {
    const original = candidate(record.documentId);
    const draft = tryEditorialRepair(original, "draft", tools);
    expect(draft.ok).toBe(true);
    expect(draft.document).toMatchObject({ workflowState: "ready_for_proof", annotationNeeded: true, undisclosedDeletion: true,
      editorialRepair: { indication: record.indication, style: "italic", status: "draft" } });
    const proof = tryEditorialRepair(draft.document, "proof", tools);
    expect(proof.document).toMatchObject({ workflowState: "proofed", annotationNeeded: false, undisclosedDeletion: false,
      editorialRepair: { indication: record.indication, style: "italic", status: "proofed" } });
    expect(original).not.toHaveProperty("editorialRepair");
    expect(proof.document.equities).toEqual(original.equities);
    expect(proof.document.reviewStatus).toBe(original.reviewStatus);
    expect(proof.document.repository).toBe(original.repository);
  });

  it("does not turn annotation repair into citation verification or agency clearance", () => {
    const original = { ...candidate(), citationComplete: false };
    const draft = tryEditorialRepair(original, "draft", tools).document;
    const proof = tryEditorialRepair(draft, "proof", tools).document;
    expect(proof.citationComplete).toBe(false);
    expect(proof.equities).toEqual(original.equities);
    expect(proof.reviewStatus).toBe(original.reviewStatus);
  });

  it.each(["draft", "proof"] as const)("requires the matching tool for %s", action => {
    const document = tryEditorialRepair(candidate(), "draft", tools).document;
    const wrong = new Set<ProcessItemId>([action === "draft" ? "proof_lens" : "red_pencil"]);
    expect(tryEditorialRepair(document, action, wrong)).toMatchObject({ ok: false, document, reason: expect.stringContaining("NEED") });
  });

  it("refuses to approve an absent, wrong or roman-type withholding indication", () => {
    const document = candidate();
    expect(tryEditorialRepair(document, "proof", tools).ok).toBe(false);
    const draft = tryEditorialRepair(document, "draft", tools).document;
    draft.editorialRepair!.indication = "[unrelated material]";
    expect(tryEditorialRepair(draft, "proof", tools).ok).toBe(false);
    expect(editorialRepairDraftMatches({ ...draft, editorialRepair: { ...draft.editorialRepair!, style: "roman" as "italic" } }, EDITORIAL_REPAIR_RECORDS[0])).toBe(false);
  });

  it("never invents repair evidence or silently rewrites a published record", () => {
    for (const document of [candidate("telegram_001"), { ...candidate(), workflowState: "published" as const }, { ...candidate(), selected: false }]) {
      expect(tryEditorialRepair(document, "draft", tools)).toMatchObject({ ok: false, document });
    }
    expect(nextEditorialRepair([{ ...candidate(), workflowState: "published" }], [])).toBeNull();
  });

  it("queues a document-linked ledger entry even when its old boolean flag is absent", () => {
    const document = { ...candidate(), undisclosedDeletion: false, annotationNeeded: false };
    expect(nextEditorialRepair([document], [])).toBeNull();
    expect(nextEditorialRepair([document], [{ documentId: document.id, violation: "undisclosed_deletion", unresolved: true }])?.documentId).toBe(document.id);
    expect(nextEditorialRepair([document], [{ documentId: document.id, violation: "missed_30_year_deadline", unresolved: true }])).toBeNull();
  });
});

describe("completed chapter correction and save boundary", () => {
  function setup() {
    gameState.sceneProgress.silentReadReviewStep = 8;
    gameState.sceneProgress.silentReadReviewStatus = 0;
    gameState.sceneProgress.buckramBindingStep = 2;
    for (const tool of tools) addProcessItem(tool);
    gameState.documentCandidates = [candidate()];
    recordStandardsViolation("undisclosed_deletion", "Seeded lost bracket", "source_note_047");
  }

  it("keeps chapter rewards, agency responses, other violations and bindery progress intact", () => {
    setup();
    recordStandardsViolation("missed_30_year_deadline", "Unrelated deadline");
    recordStandardsViolation("altered_text", "Another unresolved edit", "source_note_047");
    recordStandardsViolation("undisclosed_deletion", "Another document", "sbu_annotation_001");
    const before = createGameSaveData().state;
    expect(repairEditorialRecord("source_note_047", "draft").ok).toBe(true);
    expect(gameState.standardsViolations.every(record => record.unresolved)).toBe(true);
    const save = createGameSaveData();
    gameState.documentCandidates[0].editorialRepair!.indication = "Mutated live object";
    resetGameState(); restoreGameSaveData(save);
    expect(gameState.documentCandidates[0].editorialRepair?.indication).toBe(EDITORIAL_REPAIR_RECORDS[0].indication);
    expect(repairEditorialRecord("source_note_047", "proof").ok).toBe(true);
    expect(gameState.standardsViolations.filter(record => record.unresolved).map(record => record.context))
      .toEqual(["Unrelated deadline", "Another unresolved edit", "Another document"]);
    for (const key of ["inventory", "sceneProgress", "documentPoints", "reliability", "processStamps", "volumeFragments", "dungeons"] as const) {
      expect(gameState[key]).toEqual(before[key]);
    }
    expect(gameState.documentCandidates[0].equities).toEqual(before.documentCandidates[0].equities);
    expect(repairEditorialRecord("source_note_047", "proof").ok).toBe(false);
    const filed = createGameSaveData(); resetGameState(); restoreGameSaveData(filed);
    expect(gameState.documentCandidates[0].editorialRepair?.status).toBe("proofed");
  });

  it("does not reopen an unfinished chapter or another document", () => {
    setup(); gameState.sceneProgress.silentReadReviewStep = 7;
    expect(repairEditorialRecord("source_note_047", "draft").ok).toBe(false);
    gameState.sceneProgress.silentReadReviewStep = 8;
    expect(repairEditorialRecord("telegram_001", "draft").ok).toBe(false);
  });

  it("invalidates an earlier correction if that document is damaged again", () => {
    setup(); repairEditorialRecord("source_note_047", "draft"); repairEditorialRecord("source_note_047", "proof");
    const copy = cloneDocumentCandidate(gameState.documentCandidates[0]);
    copy.editorialRepair!.indication = "External copy";
    expect(gameState.documentCandidates[0].editorialRepair!.indication).not.toBe(copy.editorialRepair!.indication);
    markDocumentUndisclosedDeletion("source_note_047");
    expect(gameState.documentCandidates[0].editorialRepair).toBeUndefined();
    expect(repairEditorialRecord("source_note_047", "proof").ok).toBe(false);
    expect(repairEditorialRecord("source_note_047", "draft").ok).toBe(true);
  });
});
