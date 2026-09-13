import { CLEARANCE_PROCEDURE_PROMPTS } from "./clearanceProcedure";
import { DECLASSIFICATION_REVIEW_PROMPTS } from "./declassificationReview";
import { EO13526_REVIEW_PROMPTS } from "./eo13526Review";
import { ABOUT_SERIES_SOURCE } from "./aboutSeries";
import { validateWithholdingEntry } from "./withholdingChronology";

export type ClassNetVaultStationId = "human_desk" | "release_board" | "decision_ledger";

export type ClassNetVaultDocketId =
  | "clearance_lane"
  | "release_standard"
  | "decision_trail";

export const CLASSNET_VAULT_STATION_LABELS: Record<ClassNetVaultStationId, string> = {
  human_desk: "HUMAN",
  release_board: "RELEASE",
  decision_ledger: "LEDGER"
};

export const CLASSNET_WITHHOLDING_REVIEW = {
  question: "A memo is withheld in full. What goes in its dated place?",
  evidence: "TRAINING MEMO: reviewer withheld all 3 pages.",
  failureMessage: "Withheld text stays closed, but its heading, source note and page count stay in chronological place.",
  sourceUrl: ABOUT_SERIES_SOURCE.url
} as const;

export interface ClassNetVaultDocket {
  id: ClassNetVaultDocketId;
  order: 1 | 2 | 3;
  label: string;
  shortLabel: string;
  station: ClassNetVaultStationId;
  stationLabel: string;
  checkIds: readonly string[];
  contentsLabel: string;
  successMessage: string;
}

export interface ClassNetVaultRouteResult {
  ok: boolean;
  status: "filed" | "wrong-route" | "review-required" | "revision-required";
  docket: ClassNetVaultDocket;
  station: ClassNetVaultStationId;
  nextStep: number;
  complete: boolean;
  message: string;
}

export interface ClassNetVaultLegacyProgress {
  classNetVaultReviewStep?: number;
  classNetVaultReviewComplete?: number;
  clearanceProcedureComplete?: number;
  eo13526ReviewComplete?: number;
  declassificationReviewComplete?: number;
}

export const CLASSNET_VAULT_DOCKETS = [
  {
    id: "clearance_lane",
    order: 1,
    label: "Clearance Lane",
    shortLabel: "LANE",
    station: "human_desk",
    stationLabel: "Human Review Desk",
    checkIds: CLEARANCE_PROCEDURE_PROMPTS.map((prompt) => prompt.id),
    contentsLabel: "Recorded reviewer lane and agency referral trail",
    successMessage: "Recorded human review lane filed; agency referrals remain documented."
  },
  {
    id: "release_standard",
    order: 2,
    label: "E.O. 13526 Release",
    shortLabel: "E.O.",
    station: "release_board",
    stationLabel: "Release Standard Board",
    checkIds: EO13526_REVIEW_PROMPTS.map((prompt) => prompt.id),
    contentsLabel: "Recorded release terms and reviewer excision counts",
    successMessage: "Recorded release terms filed; accounting is checked at the ledger."
  },
  {
    id: "decision_trail",
    order: 3,
    label: "Equity Decision Trail",
    shortLabel: "EQUITY",
    station: "decision_ledger",
    stationLabel: "Decision Ledger",
    checkIds: DECLASSIFICATION_REVIEW_PROMPTS.map((prompt) => prompt.id),
    contentsLabel: "Training memo: reviewer withheld 3 pages in full",
    successMessage: "Withheld memo accounted for in its chronological place."
  }
] as const satisfies readonly ClassNetVaultDocket[];

export const CLASSNET_VAULT_CHECK_TOTAL = CLASSNET_VAULT_DOCKETS.reduce(
  (total, docket) => total + docket.checkIds.length,
  0
);

export function getClassNetVaultDocket(step: number) {
  return CLASSNET_VAULT_DOCKETS[
    Math.max(0, Math.min(CLASSNET_VAULT_DOCKETS.length - 1, step))
  ];
}

export function carriedClassNetVaultDocket(progress: Readonly<Record<string, number>>) {
  const order = Math.floor(progress.classNetVaultDocketCarried ?? 0);
  return CLASSNET_VAULT_DOCKETS.find(docket => docket.order === order) ?? null;
}

export function classNetVaultObjective(step: number, carried: boolean, tokenCollected: boolean) {
  if (tokenCollected) return "EXIT EAST - REFERRAL";
  if (step >= CLASSNET_VAULT_DOCKETS.length) return "TAKE CLEARANCE TOKEN";
  const docket = getClassNetVaultDocket(step);
  const destination: Record<ClassNetVaultStationId, string> = {
    human_desk: "HUMAN DESK",
    release_board: "RELEASE BOARD",
    decision_ledger: "LEDGER"
  };
  return carried
    ? `${docket.order}/3 TO ${destination[docket.station]}`
    : step === 0
      ? "TAKE REVIEW BATCH"
      : `RESUME ${docket.order}/3 AT PED`;
}

export function completedClassNetVaultChecks(step: number) {
  return CLASSNET_VAULT_DOCKETS
    .slice(0, Math.max(0, Math.min(CLASSNET_VAULT_DOCKETS.length, step)))
    .reduce((total, docket) => total + docket.checkIds.length, 0);
}

export function deriveClassNetVaultStep(progress: ClassNetVaultLegacyProgress) {
  if (progress.classNetVaultReviewComplete) return CLASSNET_VAULT_DOCKETS.length;
  if (progress.declassificationReviewComplete) return CLASSNET_VAULT_DOCKETS.length;
  if (progress.eo13526ReviewComplete) return 2;
  if (progress.clearanceProcedureComplete) return 1;
  if ((progress.classNetVaultReviewStep ?? 0) >= CLASSNET_VAULT_DOCKETS.length) {
    return CLASSNET_VAULT_DOCKETS.length;
  }
  return Math.max(0, Math.min(
    CLASSNET_VAULT_DOCKETS.length - 1,
    Math.floor(progress.classNetVaultReviewStep ?? 0)
  ));
}

export function routeClassNetVaultDocket(
  step: number,
  docketId: ClassNetVaultDocketId,
  station: ClassNetVaultStationId,
  decision?: number
): ClassNetVaultRouteResult {
  const expected = getClassNetVaultDocket(step);
  const docket = CLASSNET_VAULT_DOCKETS.find((candidate) => candidate.id === docketId) ?? expected;
  const routeMatches = step < CLASSNET_VAULT_DOCKETS.length
    && docket.id === expected.id && station === docket.station;
  const needsReview = docket.id === "decision_trail";
  const status: ClassNetVaultRouteResult["status"] = !routeMatches ? "wrong-route"
    : !needsReview ? "filed"
    : decision === undefined ? "review-required"
    : validateWithholdingEntry(decision).ok ? "filed" : "revision-required";
  const ok = status === "filed";
  const nextStep = ok ? step + 1 : step;
  return {
    ok,
    status,
    docket,
    station,
    nextStep,
    complete: ok && nextStep >= CLASSNET_VAULT_DOCKETS.length,
    message: ok
      ? docket.successMessage
      : status === "review-required" ? CLASSNET_WITHHOLDING_REVIEW.question
      : status === "revision-required" ? CLASSNET_WITHHOLDING_REVIEW.failureMessage
      : step >= CLASSNET_VAULT_DOCKETS.length ? "All review dockets are already filed."
      : docket.id !== expected.id
        ? `${expected.label} is the next docket in the vault queue.`
        : `${docket.label} belongs at the ${docket.stationLabel}. Docket remains in hand.`
  };
}

export function classNetBatchDocketAfterRoute(result: ClassNetVaultRouteResult): ClassNetVaultDocket | null {
  if (result.complete) return null;
  return result.ok ? getClassNetVaultDocket(result.nextStep) : result.docket;
}
