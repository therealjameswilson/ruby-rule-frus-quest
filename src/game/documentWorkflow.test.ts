import { describe, expect, it } from "vitest";
import type { ProcessItemId } from "./constants";
import {
  ACTION_REQUIRED_ITEM,
  applyDocumentWorkflowAction,
  canPerformAction,
  cloneDocumentCandidate,
  INITIAL_DOCUMENT_CANDIDATES,
  tryWorkflowAction
} from "./documentWorkflow";
import type { DocumentWorkflowAction } from "./documentWorkflow";
import type { DocumentCandidate } from "./types";

function startingDocument(): DocumentCandidate {
  return cloneDocumentCandidate(INITIAL_DOCUMENT_CANDIDATES[0]);
}

function fullToolInventory() {
  return new Set<ProcessItemId>([
    "citation_stamp",
    "concurrence_slip",
    "clearance_token",
    "red_pencil",
    "proof_lens",
    "buckram_key"
  ]);
}

function applyActions(
  document: DocumentCandidate,
  actions: readonly DocumentWorkflowAction[],
  inventory: Set<ProcessItemId>
) {
  return actions.reduce((current, action) => {
    const result = tryWorkflowAction(current, action, inventory);
    expect(result.ok, result.reason).toBe(true);
    return result.document;
  }, document);
}

describe("document workflow item gating", () => {
  it("blocks gated workflow actions without the matching FRUS tool and allows them with it", () => {
    for (const [action, requiredItem] of Object.entries(ACTION_REQUIRED_ITEM) as Array<[DocumentWorkflowAction, ProcessItemId]>) {
      expect(canPerformAction(action, new Set())).toBe(false);
      expect(canPerformAction(action, new Set<ProcessItemId>([requiredItem]))).toBe(true);
    }
    expect(canPerformAction("select", new Set())).toBe(true);
  });

  it("tryWorkflowAction returns a locked result with a reason when the required tool is missing", () => {
    const document = applyDocumentWorkflowAction(startingDocument(), "select");
    const result = tryWorkflowAction(document, "verify_citation", new Set());

    expect(result.ok).toBe(false);
    expect(result.reason).toContain("Citation Stamp");
    expect(result.document.workflowState).toBe("selected");
  });

  it("tryWorkflowAction matches applyDocumentWorkflowAction when the gate is open", () => {
    const document = applyDocumentWorkflowAction(startingDocument(), "select");
    const inventory = new Set<ProcessItemId>(["citation_stamp"]);
    const result = tryWorkflowAction(document, "verify_citation", inventory);
    const direct = applyDocumentWorkflowAction(document, "verify_citation");

    expect(result.ok).toBe(true);
    expect(result.document).toEqual(direct);
  });

  it("publishes a document through the full path only when every required tool is present", () => {
    const actions: DocumentWorkflowAction[] = [
      "select",
      "verify_citation",
      "prepare_review",
      "submit_review",
      "refer_agency",
      "clear",
      "ready_proof",
      "proof",
      "publish"
    ];

    const published = applyActions(startingDocument(), actions, fullToolInventory());
    expect(published.workflowState).toBe("published");

    const missingProofLens = new Set<ProcessItemId>([
      "citation_stamp",
      "concurrence_slip",
      "clearance_token",
      "buckram_key"
    ]);
    const beforeProof = applyActions(startingDocument(), actions.slice(0, 7), missingProofLens);
    const blockedProof = tryWorkflowAction(beforeProof, "proof", missingProofLens);

    expect(blockedProof.ok).toBe(false);
    expect(blockedProof.reason).toContain("Proof Lens");
    expect(blockedProof.document.workflowState).toBe("ready_for_proof");
  });
});
