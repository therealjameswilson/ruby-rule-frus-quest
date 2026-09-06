import type { ProcessItemId } from "./constants";
import type { DocumentCandidate } from "./types";

export const EDITORIAL_REPAIR_TITLE = "REPAIR:";
export const EDITORIAL_RECHECK_TITLE = "RECHECK:";

// These are authored practice records, not the contents of a historical source.
export const EDITORIAL_REPAIR_RECORDS = [
  { documentId: "source_note_047", label: "SOURCE NOTE 47", evidence: "3 LINES REMAIN CLASSIFIED", indication: "[3 lines not declassified]" },
  { documentId: "sbu_annotation_001", label: "REFERRAL NOTE", evidence: "TEXT WITHHELD / EXTENT UNKNOWN", indication: "[Text not declassified]" }
] as const;

export type EditorialRepairRecord = (typeof EDITORIAL_REPAIR_RECORDS)[number];
export type EditorialRepairAction = "draft" | "proof";
export type EditorialRepair = { indication: string; style: "italic"; status: "draft" | "proofed" };
type Violation = { documentId: string | null; violation: string; unresolved: boolean };

export function nextEditorialRepair(documents: readonly DocumentCandidate[], violations: readonly Violation[]) {
  return EDITORIAL_REPAIR_RECORDS.find(record => {
    const document = documents.find(candidate => candidate.id === record.documentId);
    return document && document.workflowState !== "published" && (
      document.undisclosedDeletion || document.editorialRepair?.status === "draft"
      || violations.some(violation => violation.unresolved && violation.documentId === document.id
        && violation.violation === "undisclosed_deletion")
    );
  }) ?? null;
}

export function editorialRepairDraftMatches(document: DocumentCandidate, record: EditorialRepairRecord) {
  return document.editorialRepair?.status === "draft"
    && document.editorialRepair.indication === record.indication && document.editorialRepair.style === "italic";
}

export function tryEditorialRepair(document: DocumentCandidate, action: EditorialRepairAction, inventory: ReadonlySet<ProcessItemId>):
  { ok: boolean; document: DocumentCandidate; reason?: string } {
  const locked = (reason: string) => ({ ok: false, document, reason });
  const record = EDITORIAL_REPAIR_RECORDS.find(record => record.documentId === document.id);
  if (!record) return locked("NO RETAINED REPAIR EVIDENCE");
  if (document.workflowState === "published") return locked("PUBLISHED RECORD - NO SILENT EDIT");
  if (!document.selected || !["proofed", "ready_for_proof"].includes(document.workflowState)) return locked("COMPLETE THE RECORD REVIEW FIRST");
  if (!inventory.has(action === "draft" ? "red_pencil" : "proof_lens")) {
    return locked(action === "draft" ? "NEED RED PENCIL" : "NEED PROOF LENS");
  }
  if (action === "proof" && !editorialRepairDraftMatches(document, record)) return locked("REPAIR AT EDITOR DESK FIRST");
  // Do not use the general proof transition here: it also resolves agency responses.
  return {
    ok: true,
    document: {
      ...document,
      workflowState: action === "draft" ? "ready_for_proof" : "proofed",
      annotationNeeded: action === "draft",
      undisclosedDeletion: action === "draft" ? document.undisclosedDeletion : false,
      editorialRepair: { indication: record.indication, style: "italic", status: action === "draft" ? "draft" : "proofed" }
    }
  };
}
