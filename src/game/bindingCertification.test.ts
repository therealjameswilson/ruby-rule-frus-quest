import { describe, expect, it } from "vitest";
import { bindingCertificationEvidence, isLegacyCertificationExercise } from "./bindingCertification";
import { INITIAL_DOCUMENT_CANDIDATES } from "./documentWorkflow";
import type { StandardsViolationRecord } from "./state";
import type { DocumentCandidate, ReviewStatus } from "./types";

function proof(response: ReviewStatus = "cleared"): DocumentCandidate {
  return {
    ...INITIAL_DOCUMENT_CANDIDATES[0], selected: true, citationComplete: true,
    annotationNeeded: false, workflowState: "proofed", undisclosedDeletion: false,
    reviewStatus: "resolved", equities: [{ agencyId: "equity", fictionalName: "Training equity", issueType: "military", response }]
  };
}

function violation(overrides: Partial<StandardsViolationRecord> = {}): StandardsViolationRecord {
  return { id: "test", violation: "concealed_policy_defect", label: "Policy defect", context: "document review", documentId: null, unresolved: true, count: 1, ...overrides };
}

describe("human binding certification evidence", () => {
  it("requires a nonempty proofed record and actual equity decisions", () => {
    expect(bindingCertificationEvidence([], []).ready).toBe(false);
    expect(bindingCertificationEvidence([{ ...proof(), equities: [] }], []).ready).toBe(false);
    expect(bindingCertificationEvidence([proof()], [])).toMatchObject({ ready: true, documents: 1, proofed: 1, resolved: 1, equities: 1 });
  });

  it.each(["cleared", "excised", "denied", "resolved"] as const)("counts %s as a filed decision, not an assertion of release", response => {
    expect(bindingCertificationEvidence([proof(response)], []).ready).toBe(true);
  });

  it.each(["not_submitted", "submitted", "referred", "appeal_needed"] as const)("rejects the unresolved %s response even when the same equity is cleared elsewhere", response => {
    expect(bindingCertificationEvidence([proof(), { ...proof(response), id: "second" }], []))
      .toMatchObject({ ready: false, equities: 1, resolved: 0 });
  });

  it("does not use unselected training documents to block the published record", () => {
    expect(bindingCertificationEvidence([proof(), { ...proof("not_submitted"), selected: false }], []).ready).toBe(true);
  });

  it.each([
    { citationComplete: false }, { annotationNeeded: true }, { workflowState: "ready_for_proof" as const }, { undisclosedDeletion: true }
  ])("keeps incomplete work blocked: %j", patch => {
    expect(bindingCertificationEvidence([{ ...proof(), ...patch }], []).ready).toBe(false);
  });

  it("never clears actual violations by merely looking at the board", () => {
    const records = [violation()];
    expect(bindingCertificationEvidence([proof()], records)).toMatchObject({ ready: false, unresolved: 1 });
    expect(records[0].unresolved).toBe(true);
    expect(bindingCertificationEvidence([proof()], [violation({ unresolved: false })]).ready).toBe(true);
  });

  it("isolates old quiz corrections from document edits and deadline violations", () => {
    const context = "Kellogg final certification: practice response";
    expect(isLegacyCertificationExercise(violation({ context }))).toBe(true);
    expect(bindingCertificationEvidence([proof()], [violation({ context })]).ready).toBe(true);
    expect(isLegacyCertificationExercise(violation({ context, documentId: "doc-001" }))).toBe(false);
    expect(isLegacyCertificationExercise(violation({ context, violation: "missed_30_year_deadline" }))).toBe(false);
  });
});
