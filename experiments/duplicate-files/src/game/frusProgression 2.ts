import type { AgencyEquity, DocumentCandidate, ReviewStatus } from "./types";
import type { ProcessStampId } from "./constants";

export type PendantId = "objectivity" | "provenance" | "review";

export const PENDANTS = [
  {
    id: "objectivity",
    label: "OBJ",
    title: "Historical objectivity",
    stampId: "rule"
  },
  {
    id: "provenance",
    label: "SRC",
    title: "Research provenance",
    stampId: "archive"
  },
  {
    id: "review",
    label: "SOP",
    title: "Annotation review discipline",
    stampId: "sop"
  }
] as const satisfies ReadonlyArray<{
  id: PendantId;
  label: string;
  title: string;
  stampId: ProcessStampId;
}>;

export const REQUIRED_RESEARCH_PENDANTS = PENDANTS;

export const EQUITY_CRYSTAL_STATUSES = new Set<ReviewStatus>(["cleared", "excised", "denied", "resolved"]);

type EquityBearingDocument = Pick<DocumentCandidate, "equities">;

function toStampSet(stamps: ReadonlySet<ProcessStampId> | readonly ProcessStampId[]) {
  return stamps instanceof Set ? stamps : new Set(stamps);
}

function equityKey(equity: AgencyEquity) {
  return equity.agencyId;
}

function distinctEquities(documents: readonly EquityBearingDocument[]) {
  const equities = new Map<string, AgencyEquity>();
  for (const document of documents) {
    for (const equity of document.equities) {
      if (!equities.has(equityKey(equity))) equities.set(equityKey(equity), equity);
    }
  }
  return [...equities.values()];
}

function completedEquityIds(documents: readonly EquityBearingDocument[]) {
  const completed = new Set<string>();
  for (const document of documents) {
    for (const equity of document.equities) {
      if (EQUITY_CRYSTAL_STATUSES.has(equity.response)) completed.add(equityKey(equity));
    }
  }
  return completed;
}

export function compilationIsComplete(stamps: ReadonlySet<ProcessStampId> | readonly ProcessStampId[]) {
  const held = toStampSet(stamps);
  return REQUIRED_RESEARCH_PENDANTS.every((pendant) => held.has(pendant.stampId));
}

export function totalEquities(documents: readonly EquityBearingDocument[]) {
  return distinctEquities(documents).length;
}

export function crystalsEarned(documents: readonly EquityBearingDocument[]) {
  return completedEquityIds(documents).size;
}

export function buckramGateOpen(
  stamps: ReadonlySet<ProcessStampId> | readonly ProcessStampId[],
  documents: readonly EquityBearingDocument[]
) {
  const total = totalEquities(documents);
  return compilationIsComplete(stamps) && total > 0 && crystalsEarned(documents) === total;
}
