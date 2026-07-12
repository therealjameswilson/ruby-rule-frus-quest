import type { ProcessItemId } from "./constants";
import { AI_ANNOTATION_REVIEW_PROMPTS } from "./aiAnnotationReview";
import { EDITORIAL_METHODOLOGY_PROMPTS } from "./editorialMethodology";
import { EDITORIAL_TREATMENT_PROMPTS } from "./editorialTreatment";
import { TYPEFLOW_ORDER_PROMPTS } from "./typeflowOrder";
import { TYPESETTING_PREPARATION_PROMPTS } from "./typesettingPreparation";
import { TYPESETTER_PROOF_PROMPTS } from "./typesetterProof";

export type SilentReadReviewPhase = "editor" | "evidence" | "production";
export type SilentReadReviewKind = "mechanical" | "evidence_bound" | "classification" | "production";
export type SilentReadReviewStatus = "waiting" | "carried" | "routed" | "verified" | "stamped";
export type SilentReadStationId =
  | "opennet"
  | "classnet"
  | "editor-desk"
  | "referral-tray"
  | "proof-table"
  | "consultation-desk"
  | "typeflow-rail";

export interface SilentReadReviewItem {
  id: string;
  label: string;
  shortLabel: string;
  kind: SilentReadReviewKind;
  phase: SilentReadReviewPhase;
  destination: SilentReadStationId;
  texture: string;
  checkIds: readonly string[];
}

const promptIds = (prompts: ReadonlyArray<{ id: string }>) => prompts.map((prompt) => prompt.id);

export const SILENT_READ_REVIEW_ITEMS = [
  {
    id: "mechanical-fix",
    label: "StateChat Mechanical Fix and Visible Bracket",
    shortLabel: "DRAFT + [ ]",
    kind: "mechanical",
    phase: "editor",
    destination: "editor-desk",
    texture: "red-pencil",
    checkIds: [...promptIds(AI_ANNOTATION_REVIEW_PROMPTS), "visible-bracket"]
  },
  {
    id: "public-crossref",
    label: "Evidence-Bound OpenNet Cross-Reference",
    shortLabel: "OPEN NOTE",
    kind: "evidence_bound",
    phase: "evidence",
    destination: "opennet",
    texture: "cross-reference",
    checkIds: ["publication-status"]
  },
  {
    id: "classified-source",
    label: "Evidence-Bound ClassNet Source Note",
    shortLabel: "CLASS NOTE",
    kind: "classification",
    phase: "evidence",
    destination: "classnet",
    texture: "source-note",
    checkIds: ["classification-status"]
  },
  {
    id: "referral-equity",
    label: "Evidence-Bound Referral Equity Slip",
    shortLabel: "REF SLIP",
    kind: "evidence_bound",
    phase: "evidence",
    destination: "referral-tray",
    texture: "concurrence-slip",
    checkIds: ["agency-equity"]
  },
  {
    id: "proof-date",
    label: "Evidence-Bound Proof Date Discrepancy",
    shortLabel: "PROOF DATE",
    kind: "evidence_bound",
    phase: "evidence",
    destination: "proof-table",
    texture: "proof-page",
    checkIds: ["date-discrepancy"]
  },
  {
    id: "editorial-ledger",
    label: "Editorial Method and Treatment Ledger",
    shortLabel: "METHOD LEDGER",
    kind: "production",
    phase: "production",
    destination: "consultation-desk",
    texture: "review-folder",
    checkIds: [
      ...promptIds(EDITORIAL_METHODOLOGY_PROMPTS),
      ...promptIds(EDITORIAL_TREATMENT_PROMPTS)
    ]
  },
  {
    id: "printer-copy",
    label: "Cleared Printer's Copy Sequence",
    shortLabel: "PRINTER COPY",
    kind: "production",
    phase: "production",
    destination: "typeflow-rail",
    texture: "proof-page",
    checkIds: [
      ...promptIds(TYPEFLOW_ORDER_PROMPTS),
      ...promptIds(TYPESETTING_PREPARATION_PROMPTS)
    ]
  },
  {
    id: "typesetter-proof",
    label: "Typesetter Proof Pull",
    shortLabel: "PROOF PULL",
    kind: "production",
    phase: "production",
    destination: "proof-table",
    texture: "proof-lens",
    checkIds: promptIds(TYPESETTER_PROOF_PROMPTS)
  }
] as const satisfies readonly SilentReadReviewItem[];

export const SILENT_READ_REVIEW_TOTAL = SILENT_READ_REVIEW_ITEMS.length;

export interface SilentReadRouteResult {
  ok: boolean;
  item: SilentReadReviewItem;
  reason?: string;
}

export function routeSilentReadReviewItem(
  step: number,
  itemId: string,
  stationId: SilentReadStationId
): SilentReadRouteResult {
  const item = SILENT_READ_REVIEW_ITEMS[Math.max(0, Math.min(SILENT_READ_REVIEW_TOTAL - 1, step))];
  if (item.id !== itemId) {
    return { ok: false, item, reason: `${item.label} must be handled before ${itemId}.` };
  }
  if (item.destination !== stationId) {
    return { ok: false, item, reason: `${item.shortLabel} belongs at ${item.destination}.` };
  }
  return { ok: true, item };
}

export function silentReadReviewStatusCode(status: SilentReadReviewStatus) {
  if (status === "carried") return 1;
  if (status === "routed") return 2;
  if (status === "verified") return 3;
  return 0;
}

export function silentReadReviewStatusFromCode(code: number): SilentReadReviewStatus {
  if (code === 1) return "carried";
  if (code === 2) return "routed";
  if (code === 3) return "verified";
  return "waiting";
}

export function deriveSilentReadReviewStep(
  sceneProgress: Readonly<Record<string, number>>,
  processItems: ReadonlySet<ProcessItemId>
) {
  const explicit = sceneProgress.silentReadReviewStep;
  if (Number.isFinite(explicit)) {
    return Math.max(0, Math.min(SILENT_READ_REVIEW_TOTAL, Math.floor(explicit)));
  }

  let step = 0;
  if (processItems.has("red_pencil") || sceneProgress.aiAnnotationReviewComplete) step = 1;
  if (processItems.has("proof_lens")) step = 5;
  if (sceneProgress.editorialMethodologyComplete && sceneProgress.editorialTreatmentComplete) step = 6;
  if (sceneProgress.typeflowOrderComplete && sceneProgress.typesettingPreparationComplete) step = 7;
  if (processItems.has("buckram_key") || sceneProgress.typesetterProofComplete) step = SILENT_READ_REVIEW_TOTAL;
  return step;
}
