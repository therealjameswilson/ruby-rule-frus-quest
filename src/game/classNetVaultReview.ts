import { CLEARANCE_PROCEDURE_PROMPTS } from "./clearanceProcedure";
import { DECLASSIFICATION_REVIEW_PROMPTS } from "./declassificationReview";
import { EO13526_REVIEW_PROMPTS } from "./eo13526Review";

export type ClassNetVaultStationId = "human_desk" | "release_board" | "decision_ledger";

export type ClassNetVaultDocketId =
  | "clearance_lane"
  | "release_standard"
  | "decision_trail";

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
    contentsLabel: "Separate function / era lane / agency referral",
    successMessage: "Clearance lane filed with accountable human review."
  },
  {
    id: "release_standard",
    order: 2,
    label: "E.O. 13526 Release",
    shortLabel: "E.O.",
    station: "release_board",
    stationLabel: "Release Standard Board",
    checkIds: EO13526_REVIEW_PROMPTS.map((prompt) => prompt.id),
    contentsLabel: "Release standard / concurrence / visible accounting",
    successMessage: "E.O. 13526 release standard filed with visible accounting."
  },
  {
    id: "decision_trail",
    order: 3,
    label: "Equity Decision Trail",
    shortLabel: "EQUITY",
    station: "decision_ledger",
    stationLabel: "Decision Ledger",
    checkIds: DECLASSIFICATION_REVIEW_PROMPTS.map((prompt) => prompt.id),
    contentsLabel: "Human equity / ClassNet channel / documented decision",
    successMessage: "Classified equity decision trail filed for human review."
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
  station: ClassNetVaultStationId
): ClassNetVaultRouteResult {
  const expected = getClassNetVaultDocket(step);
  const docket = CLASSNET_VAULT_DOCKETS.find((candidate) => candidate.id === docketId) ?? expected;
  const ok = docket.id === expected.id && station === docket.station;
  const nextStep = ok ? step + 1 : step;
  return {
    ok,
    docket,
    station,
    nextStep,
    complete: ok && nextStep >= CLASSNET_VAULT_DOCKETS.length,
    message: ok
      ? docket.successMessage
      : docket.id !== expected.id
        ? `${expected.label} is the next docket in the vault queue.`
        : `${docket.label} belongs at the ${docket.stationLabel}. Docket returned to the pedestal.`
  };
}
