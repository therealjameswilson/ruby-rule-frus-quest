import type { ProcessItemId } from "./constants";
import type { ChoiceOption } from "./types";
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

interface ReviewDecision {
  question: string;
  context: string;
  options: readonly ChoiceOption[];
  correctValue: string;
  successMessage: string;
  failureMessage: string;
}

const REVIEW_DECISIONS: Partial<Record<(typeof SILENT_READ_REVIEW_ITEMS)[number]["id"], ReviewDecision>> = {
  "mechanical-fix": {
    question: "A passage is withheld. What prints in its place?",
    context: "Editor proof: the reader must see where text was removed.",
    options: [
      { key: "A", label: "Close the gap; print nothing", value: "hidden" },
      { key: "B", label: "[Text not declassified]", value: "visible" }
    ],
    correctValue: "visible",
    successMessage: "VISIBLE BRACKET ADDED",
    failureMessage: "SHOW THE DELETION IN BRACKETS"
  },
  "proof-date": {
    question: "Compare the dates. Which belongs in the proof?",
    context: "Practice source: 1947. Typeset proof: 1974.",
    options: [
      { key: "A", label: "1947 - match the source", value: "1947" },
      { key: "B", label: "1974 - keep the typeset date", value: "1974" }
    ],
    correctValue: "1947",
    successMessage: "DATE MATCHES THE SOURCE",
    failureMessage: "COMPARE AGAIN: SOURCE SAYS 1947"
  }
};

export function silentReadDecision(itemId: string): ReviewDecision | undefined {
  return Object.prototype.hasOwnProperty.call(REVIEW_DECISIONS, itemId)
    ? REVIEW_DECISIONS[itemId as keyof typeof REVIEW_DECISIONS]
    : undefined;
}

export function nextSilentReadStatus(previous: SilentReadReviewPhase, next: SilentReadReviewPhase): SilentReadReviewStatus {
  // One folder travels between desks; crossing into a new room starts its packet.
  return previous === "editor" && next !== "editor" ? "waiting" : "carried";
}

export function silentReadResumeRoom(progress: Readonly<Record<string, number>>, step: number): "E1" | "S1" {
  if (progress.silentReadRoom === 0) return "E1";
  if (progress.silentReadRoom === 1) return "S1";
  return step > 0 ? "S1" : "E1";
}

const STATION_LABELS: Record<SilentReadStationId, string> = {
  opennet: "OPENNET",
  classnet: "CLASSNET",
  "editor-desk": "EDITOR DESK",
  "referral-tray": "REFERRAL TRAY",
  "proof-table": "PROOF TABLE",
  "consultation-desk": "CONSULT DESK",
  "typeflow-rail": "TYPEFLOW RAIL"
};

export function silentReadObjective(
  item: Pick<SilentReadReviewItem, "id" | "shortLabel" | "kind" | "destination"> | null,
  status: SilentReadReviewStatus,
  inCurrentRoom = true
) {
  if (!item) return "EXIT EAST - VAULT";
  if (!inCurrentRoom) return "EXIT EAST - PROOF";
  if (status === "waiting") return `TAKE ${item.shortLabel}`;
  const station = STATION_LABELS[item.destination];
  if (status === "carried") return `TO ${station}`;
  if (status === "routed" && item.kind !== "production") {
    return item.id === "mechanical-fix" ? "ADD VISIBLE BRACKET" : `CHECK ${station}`;
  }
  return `STAMP ${station}`;
}

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
