import type { AgencyEquity, DocumentCandidate, DocumentWorkflowState, ReviewStatus, WorkflowDocument } from "./types";

export type DocumentWorkflowAction =
  | "evaluate"
  | "select"
  | "request_source_note"
  | "verify_citation"
  | "require_annotation"
  | "prepare_review"
  | "submit_review"
  | "refer_agency"
  | "clear"
  | "excise"
  | "deny"
  | "appeal"
  | "resolve"
  | "ready_proof"
  | "proof"
  | "publish";

export const DOCUMENT_WORKFLOW_STEPS: readonly DocumentWorkflowState[] = [
  "found",
  "candidate",
  "selected",
  "source_note_needed",
  "citation_verified",
  "annotation_needed",
  "ready_for_review",
  "submitted_for_review",
  "referred",
  "cleared",
  "excised",
  "denied",
  "appeal_needed",
  "ready_for_proof",
  "proofed",
  "published"
] as const;

export const DOCUMENT_WORKFLOW_TRANSITIONS: Record<DocumentWorkflowState, Partial<Record<DocumentWorkflowAction, DocumentWorkflowState>>> = {
  found: { evaluate: "candidate", select: "selected" },
  candidate: { select: "selected" },
  selected: { request_source_note: "source_note_needed", verify_citation: "citation_verified", require_annotation: "annotation_needed", prepare_review: "ready_for_review" },
  source_note_needed: { verify_citation: "citation_verified" },
  citation_verified: { require_annotation: "annotation_needed", prepare_review: "ready_for_review" },
  annotation_needed: { prepare_review: "ready_for_review" },
  ready_for_review: { submit_review: "submitted_for_review" },
  submitted_for_review: { refer_agency: "referred", clear: "cleared" },
  referred: { clear: "cleared", excise: "excised", deny: "denied", appeal: "appeal_needed" },
  cleared: { ready_proof: "ready_for_proof" },
  excised: { ready_proof: "ready_for_proof" },
  denied: { appeal: "appeal_needed" },
  appeal_needed: { resolve: "ready_for_proof" },
  ready_for_proof: { proof: "proofed" },
  proofed: { publish: "published" },
  published: {}
};

export const DOCUMENT_ROOM_LOOKUP: Record<string, string> = {
  "doc-001": "A1",
  telegram_001: "A1",
  source_note_047: "A1",
  cross_reference_001: "A1",
  sbu_annotation_001: "SilentReadScene",
  proof_page_412: "SilentReadScene"
};

export const INITIAL_DOCUMENT_CANDIDATES: readonly DocumentCandidate[] = [
  {
    id: "doc-001",
    title: "Memorandum of Conversation",
    date: "1969-02-14",
    type: "memorandum_of_conversation",
    repository: "Fictional National Archives Collection",
    collection: "Office Files of the Policy Planning Staff",
    folder: "Alliance Consultation, February 1969",
    policyTheme: "Alliance consultation",
    significance: 5,
    uniqueness: 4,
    citationComplete: false,
    annotationNeeded: true,
    sensitivityRisk: 3,
    selected: false,
    workflowState: "found",
    reviewStatus: "not_submitted",
    equities: [
      equity("fictional-defense-equity", "Defense Equity Office", "military", "not_submitted")
    ]
  },
  {
    id: "telegram_001",
    title: "Telegram on Opening Contacts",
    date: "1989-02-14",
    type: "telegram",
    repository: "National Archives",
    collection: "Central Foreign Policy Files",
    folder: "OpenNet sample cable folder",
    policyTheme: "Diplomatic opening",
    significance: 62,
    uniqueness: 54,
    citationComplete: false,
    annotationNeeded: false,
    sensitivityRisk: 18,
    selected: false,
    workflowState: "found",
    reviewStatus: "not_submitted",
    equities: []
  },
  {
    id: "source_note_047",
    title: "Source Note 47",
    date: "1989-04-07",
    type: "editorial_note",
    repository: "",
    collection: "Compiler source-note worksheet",
    folder: "Repository missing until research table verification",
    policyTheme: "Provenance trail",
    significance: 84,
    uniqueness: 74,
    citationComplete: false,
    annotationNeeded: true,
    sensitivityRisk: 42,
    selected: false,
    workflowState: "found",
    reviewStatus: "not_submitted",
    equities: [
      equity("historians-office", "Office Source Trail", "diplomatic", "not_submitted")
    ]
  },
  {
    id: "cross_reference_001",
    title: "Published FRUS Cross-Reference",
    date: "1990-06-21",
    type: "editorial_note",
    repository: "history.state.gov",
    collection: "Published FRUS cross-reference check",
    folder: "OpenNet publication-status queue",
    policyTheme: "Publication status",
    significance: 58,
    uniqueness: 48,
    citationComplete: true,
    annotationNeeded: true,
    sensitivityRisk: 12,
    selected: false,
    workflowState: "found",
    reviewStatus: "not_submitted",
    equities: []
  },
  {
    id: "sbu_annotation_001",
    title: "SBU Annotation Sheet",
    date: "1991-01-18",
    type: "briefing_paper",
    repository: "ClassNet review packet",
    collection: "Declassification annotation checks",
    folder: "SBU annotation review tray",
    policyTheme: "Classified annotation",
    significance: 71,
    uniqueness: 63,
    citationComplete: true,
    annotationNeeded: true,
    sensitivityRisk: 76,
    selected: false,
    workflowState: "found",
    reviewStatus: "not_submitted",
    equities: [
      equity("agency-cyan", "Cyan Intelligence Equity", "intelligence", "not_submitted"),
      equity("agency-red", "Red Defense Equity", "military", "not_submitted")
    ]
  },
  {
    id: "proof_page_412",
    title: "Proof Page 412 Date Discrepancy",
    date: "1992-03-12",
    type: "editorial_note",
    repository: "Typeset proof packet",
    collection: "Silent read tower proofs",
    folder: "Page 412 discrepancy sheet",
    policyTheme: "Reader clarity",
    significance: 66,
    uniqueness: 59,
    citationComplete: true,
    annotationNeeded: false,
    sensitivityRisk: 9,
    selected: false,
    workflowState: "found",
    reviewStatus: "not_submitted",
    equities: []
  }
] as const;

export function cloneInitialDocumentCandidates() {
  return INITIAL_DOCUMENT_CANDIDATES.map(cloneDocumentCandidate);
}

export function cloneDocumentCandidate(document: DocumentCandidate): DocumentCandidate {
  return {
    ...document,
    equities: document.equities.map((equityRecord) => ({ ...equityRecord }))
  };
}

export function applyDocumentWorkflowAction(document: DocumentCandidate, action: DocumentWorkflowAction): DocumentCandidate {
  const nextState = DOCUMENT_WORKFLOW_TRANSITIONS[document.workflowState][action];
  if (!nextState) return cloneDocumentCandidate(document);
  return applyDocumentWorkflowState(document, nextState);
}

export function applyDocumentWorkflowState(document: DocumentCandidate, workflowState: DocumentWorkflowState): DocumentCandidate {
  const next = cloneDocumentCandidate(document);
  next.workflowState = workflowState;

  if (workflowState !== "found") next.selected ||= workflowState !== "candidate";
  if (workflowState === "candidate") next.selected = false;
  if (workflowState === "selected") next.selected = true;
  if (workflowState === "source_note_needed") {
    next.selected = true;
    next.citationComplete = false;
  }
  if (workflowState === "citation_verified") {
    next.selected = true;
    next.citationComplete = true;
  }
  if (workflowState === "annotation_needed") {
    next.selected = true;
    next.annotationNeeded = true;
  }
  if (workflowState === "ready_for_review") {
    next.selected = true;
    next.annotationNeeded = false;
    next.reviewStatus = "not_submitted";
  }
  if (workflowState === "submitted_for_review") {
    next.selected = true;
    next.reviewStatus = "submitted";
  }
  if (workflowState === "referred") {
    next.selected = true;
    next.reviewStatus = "referred";
    next.equities = next.equities.map((equityRecord) => ({ ...equityRecord, response: equityRecord.response === "not_submitted" ? "referred" : equityRecord.response }));
  }
  if (["cleared", "excised", "denied", "appeal_needed"].includes(workflowState)) {
    next.selected = true;
    next.reviewStatus = workflowState as ReviewStatus;
  }
  if (workflowState === "ready_for_proof") {
    next.selected = true;
    next.reviewStatus = next.reviewStatus === "not_submitted" || next.reviewStatus === "submitted" || next.reviewStatus === "referred" ? "resolved" : next.reviewStatus;
    next.annotationNeeded = false;
  }
  if (workflowState === "proofed" || workflowState === "published") {
    next.selected = true;
    next.citationComplete = true;
    next.annotationNeeded = false;
    next.reviewStatus = "resolved";
    next.equities = next.equities.map((equityRecord) => ({
      ...equityRecord,
      response: equityRecord.response === "not_submitted" || equityRecord.response === "submitted" || equityRecord.response === "referred" ? "resolved" : equityRecord.response
    }));
  }
  return next;
}

export function applyAgencyEquityResponse(document: DocumentCandidate, agencyId: string, response: ReviewStatus): DocumentCandidate {
  const next = cloneDocumentCandidate(document);
  next.equities = next.equities.map((equityRecord) => equityRecord.agencyId === agencyId ? { ...equityRecord, response } : equityRecord);
  if (response === "cleared" || response === "excised" || response === "denied" || response === "appeal_needed" || response === "resolved") {
    next.reviewStatus = response;
  }
  return next;
}

export function documentToWorkflowDocument(document: DocumentCandidate): WorkflowDocument {
  return {
    id: document.id,
    displayName: document.title,
    state: document.workflowState,
    roomId: DOCUMENT_ROOM_LOOKUP[document.id] ?? "A1",
    needsHumanReview: needsHumanReview(document),
    reviewStatus: document.reviewStatus,
    selected: document.selected,
    citationComplete: document.citationComplete,
    annotationNeeded: document.annotationNeeded,
    sensitivityRisk: document.sensitivityRisk
  };
}

export function needsHumanReview(document: DocumentCandidate) {
  if (document.workflowState === "published" || document.workflowState === "proofed") return false;
  if (document.annotationNeeded || !document.citationComplete || document.sensitivityRisk >= 50) return true;
  return document.equities.some((equityRecord) => equityRecord.response !== "resolved" && equityRecord.response !== "cleared");
}

function equity(agencyId: string, fictionalName: string, issueType: AgencyEquity["issueType"], response: ReviewStatus): AgencyEquity {
  return { agencyId, fictionalName, issueType, response };
}
