import { EQUITY_CRYSTAL_STATUSES, totalEquities } from "./frusProgression";
import type { StandardsViolationRecord } from "./state";
import type { DocumentCandidate } from "./types";

const LEGACY_QUIZ_CONTEXT = "Kellogg final certification";
export const BINDING_CERTIFICATION_TITLE = "HUMAN STANDARDS SEAL";

export function isLegacyCertificationExercise(record: StandardsViolationRecord) {
  return !record.documentId && record.context?.startsWith(LEGACY_QUIZ_CONTEXT) === true
    && record.violation !== "missed_30_year_deadline";
}

/** Evidence for a human attestation, not an automatic certification of history. */
export function bindingCertificationEvidence(
  documents: readonly DocumentCandidate[],
  violations: readonly StandardsViolationRecord[]
) {
  const selected = documents.filter(document => document.selected);
  const proofed = selected.filter(document =>
    ["proofed", "published"].includes(document.workflowState)
    && document.citationComplete && !document.annotationNeeded
  ).length;
  const equities = totalEquities(documents);
  const outstanding = new Set(selected.flatMap(document => document.equities)
    .filter(equity => !EQUITY_CRYSTAL_STATUSES.has(equity.response)).map(equity => equity.agencyId));
  const resolved = Math.max(0, equities - outstanding.size);
  const hiddenCuts = documents.filter(document => document.undisclosedDeletion).length;
  const unresolved = violations.filter(record => record.unresolved && !isLegacyCertificationExercise(record)).length;
  const ready = selected.length > 0 && proofed === selected.length
    && equities > 0 && outstanding.size === 0 && hiddenCuts === 0 && unresolved === 0;
  return { documents: selected.length, proofed, equities, resolved, hiddenCuts, unresolved, ready };
}

export type BindingCertificationEvidence = ReturnType<typeof bindingCertificationEvidence>;
