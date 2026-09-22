import { FOREIGN_GOVERNMENT_PERMISSION_PROMPTS } from "./foreignGovernmentPermission";
import { WITHHOLDING_APPEAL_PROMPTS } from "./withholdingAppeal";

export type ReferralAgency = "CIA" | "DOD" | "NSC";

export type ReferralEquityPacketId =
  | "intelligence_annex"
  | "base_access_memo"
  | "white_house_minutes";

export interface ReferralEquityPacket {
  id: ReferralEquityPacketId;
  order: 1 | 2 | 3;
  label: string;
  shortLabel: string;
  agency: ReferralAgency;
}

export interface ReferralEquityRouteResult {
  ok: boolean;
  packet: ReferralEquityPacket;
  agency: ReferralAgency;
  nextStep: number;
  complete: boolean;
  message: string;
}

export type ReferralTreatmentStationId =
  | "permission_desk"
  | "appeal_ledger"
  | "bracket_press";

export type ReferralTreatmentDocketId =
  | "permission_note"
  | "appeal_record"
  | "visible_excision";

export interface ReferralTreatmentDocket {
  id: ReferralTreatmentDocketId;
  order: 1 | 2 | 3;
  label: string;
  shortLabel: string;
  station: ReferralTreatmentStationId;
  stationLabel: string;
  checkIds: readonly string[];
  successMessage: string;
}

export interface ReferralTreatmentRouteResult {
  ok: boolean;
  docket: ReferralTreatmentDocket;
  station: ReferralTreatmentStationId;
  nextStep: number;
  complete: boolean;
  message: string;
}

export interface ReferralPhysicalProgress {
  referralEquityRouteStep?: number;
  referralEquityRouteComplete?: number;
  referralManifestReviewComplete?: number;
  referralTreatmentStep?: number;
  referralPhysicalReviewComplete?: number;
  foreignGovernmentPermissionComplete?: number;
  withholdingAppealComplete?: number;
  referralGateOpen?: number;
  referralEquityPacketCarried?: number;
  referralManifestCarried?: number;
  referralTreatmentDocketCarried?: number;
}

export interface DerivedReferralPhysicalProgress {
  equityStep: number;
  manifestReviewed: boolean;
  treatmentStep: number;
  complete: boolean;
}

export const REFERRAL_EQUITY_PACKETS = [
  {
    id: "intelligence_annex",
    order: 1,
    label: "Intelligence Annex",
    shortLabel: "INTEL",
    agency: "CIA"
  },
  {
    id: "base_access_memo",
    order: 2,
    label: "Base Access Memo",
    shortLabel: "BASE",
    agency: "DOD"
  },
  {
    id: "white_house_minutes",
    order: 3,
    label: "White House Minutes",
    shortLabel: "WH",
    agency: "NSC"
  }
] as const satisfies readonly ReferralEquityPacket[];

export const REFERRAL_TREATMENT_DOCKETS = [
  {
    id: "permission_note",
    order: 1,
    label: "Foreign Information Note",
    shortLabel: "PERM",
    station: "permission_desk",
    stationLabel: "Permission Desk",
    checkIds: FOREIGN_GOVERNMENT_PERMISSION_PROMPTS.map((prompt) => prompt.id),
    successMessage: "Foreign-government information and permission outcome recorded visibly."
  },
  {
    id: "appeal_record",
    order: 2,
    label: "Withholding Appeal Record",
    shortLabel: "APPEAL",
    station: "appeal_ledger",
    stationLabel: "Appeal Ledger",
    checkIds: WITHHOLDING_APPEAL_PROMPTS.map((prompt) => prompt.id),
    successMessage: "Whole-document withholding and human appeal trail recorded."
  },
  {
    id: "visible_excision",
    order: 3,
    label: "Visible Excision Proof",
    shortLabel: "[TEXT]",
    station: "bracket_press",
    stationLabel: "Bracket Press",
    checkIds: ["bracketed_insertion"],
    successMessage: "[Text not declassified] printed visibly in the proof."
  }
] as const satisfies readonly ReferralTreatmentDocket[];

export const REFERRAL_TREATMENT_CHECK_TOTAL = REFERRAL_TREATMENT_DOCKETS.reduce(
  (total, docket) => total + docket.checkIds.length,
  0
);

export const REFERRAL_TREATMENT_LABELS: Record<ReferralTreatmentStationId, string> = {
  permission_desk: "PERMIT",
  appeal_ledger: "APPEAL",
  bracket_press: "BRACKET"
};

export type ReferralReviewStage = "equity" | "manifest" | "treatment" | "complete";

export function referralGuideHint(stage: ReferralReviewStage, step: number, carried: boolean, dispatchFound = false) {
  if (stage === "complete") return {
    short: "EAST: SLIP ROOM", message: "The review gate is open. The Concurrence Slip awaits in the east room."
  };
  if (stage === "manifest") {
    if (!carried) return {
      short: "DRAFT: STATECHAT", message: "Take StateChat's draft at the terminal. A generated routing list still needs your source check."
    };
    return dispatchFound ? {
      short: "DRAFT: HUMAN DESK", message: "Compare the dispatch copy with the draft at the human desk. Routing is not release approval."
    } : {
      short: "COPY: NORTH STACKS", message: "Find the original dispatch copy beyond the north shelves. The draft cannot verify itself."
    };
  }
  if (!carried) return {
    short: "BATCH: SOUTH TRAY", message: stage === "equity"
      ? "Take the batch from the south tray, then find the original dispatch in the north stacks."
      : "Take the review batch from the south tray. Bring it to the highlighted treatment station; keep each decision visible."
  };
  if (stage === "equity") {
    return { short: "BATCH: NORTH STACKS", message: "Carry the batch to the original dispatch in the north stacks. It prepares the referrals together; check and file the draft yourself. Routing does not grant release approval. Individual agency desks remain available." };
  }
  const docket = getReferralTreatmentDocket(step);
  if (docket.id === "visible_excision") return {
    short: "STAMP BRACKET PRESS", message: "Bring the proof to the bracket press. Use the Citation Stamp to print the visible withholding marker."
  };
  return { short: `FILE AT ${REFERRAL_TREATMENT_LABELS[docket.station]}`, message: `${docket.label}: take it to the ${docket.stationLabel}. Keep the treatment visible in the record.` };
}

export function referralReviewObjective(
  stage: ReferralReviewStage,
  step: number,
  carried: boolean,
  inRewardRoom = false,
  slipCollected = false
) {
  if (inRewardRoom) return slipCollected ? "EXIT EAST - EDITOR" : "FILE CONCURRENCE";
  if (stage === "complete") return "EXIT EAST - SLIP";
  if (stage === "manifest") return carried ? "VERIFY REFERRAL LIST" : "TAKE REFERRAL DRAFT";
  if (stage === "equity") {
    return carried ? "TRACE AGENCY EQUITY" : "TAKE EQUITY FILES";
  }
  const docket = getReferralTreatmentDocket(step);
  return carried
    ? docket.id === "visible_excision" ? "MARK EXCISED TEXT" : docket.id === "permission_note" ? "RECORD PERMISSION" : "DOCUMENT APPEAL"
    : "TAKE REVIEW RECORDS";
}

export function getReferralEquityPacket(step: number) {
  return REFERRAL_EQUITY_PACKETS[
    Math.max(0, Math.min(REFERRAL_EQUITY_PACKETS.length - 1, Number.isFinite(step) ? Math.floor(step) : 0))
  ];
}

export function getReferralTreatmentDocket(step: number) {
  return REFERRAL_TREATMENT_DOCKETS[
    Math.max(0, Math.min(REFERRAL_TREATMENT_DOCKETS.length - 1, Number.isFinite(step) ? Math.floor(step) : 0))
  ];
}

export function completedReferralTreatmentChecks(step: number) {
  return REFERRAL_TREATMENT_DOCKETS
    .slice(0, Math.max(0, Math.min(REFERRAL_TREATMENT_DOCKETS.length, Math.floor(step))))
    .reduce((total, docket) => total + docket.checkIds.length, 0);
}

export function routeReferralEquityPacket(
  step: number,
  packetId: ReferralEquityPacketId,
  agency: ReferralAgency
): ReferralEquityRouteResult {
  const expected = getReferralEquityPacket(step);
  const packet = REFERRAL_EQUITY_PACKETS.find((candidate) => candidate.id === packetId) ?? expected;
  const pending = Number.isInteger(step) && step >= 0 && step < REFERRAL_EQUITY_PACKETS.length;
  const ok = pending && packet.id === expected.id && agency === packet.agency;
  const nextStep = ok ? step + 1 : step;
  return {
    ok,
    packet,
    agency,
    nextStep,
    complete: ok && nextStep >= REFERRAL_EQUITY_PACKETS.length,
    message: !pending ? "No pending equity file to route." : ok
      ? `${packet.label} routed to the ${agency} equity desk.`
      : packet.id !== expected.id
        ? `${expected.label} is the next file in the referral tray.`
        : `${packet.label} belongs at the ${packet.agency} equity desk. File remains in hand.`
  };
}

export function routeReferralTreatmentDocket(
  step: number,
  docketId: ReferralTreatmentDocketId,
  station: ReferralTreatmentStationId
): ReferralTreatmentRouteResult {
  const expected = getReferralTreatmentDocket(step);
  const docket = REFERRAL_TREATMENT_DOCKETS.find((candidate) => candidate.id === docketId) ?? expected;
  const pending = Number.isInteger(step) && step >= 0 && step < REFERRAL_TREATMENT_DOCKETS.length;
  const ok = pending && docket.id === expected.id && station === docket.station;
  const nextStep = ok ? step + 1 : step;
  return {
    ok,
    docket,
    station,
    nextStep,
    complete: ok && nextStep >= REFERRAL_TREATMENT_DOCKETS.length,
    message: !pending ? "No pending treatment docket to file." : ok
      ? docket.successMessage
      : docket.id !== expected.id
        ? `${expected.label} is the next visible-treatment docket.`
        : `${docket.label} belongs at the ${docket.stationLabel}. Docket remains in hand.`
  };
}

export function referralBatchPacketAfterRoute(result: ReferralEquityRouteResult) {
  if (result.complete) return null;
  return REFERRAL_EQUITY_PACKETS[result.nextStep] ?? null;
}

export function referralBatchDocketAfterRoute(result: ReferralTreatmentRouteResult) {
  if (result.complete) return null;
  return REFERRAL_TREATMENT_DOCKETS[result.nextStep] ?? null;
}

export function restoreReferralCarryState(progress: ReferralPhysicalProgress, inRewardRoom = false) {
  const restored = deriveReferralPhysicalProgress(progress);
  const equity = !inRewardRoom && !restored.complete && restored.equityStep < REFERRAL_EQUITY_PACKETS.length
    ? REFERRAL_EQUITY_PACKETS[restored.equityStep] : null;
  const equityPacket = equity?.order === progress.referralEquityPacketCarried ? equity : null;
  const manifestCarried = !inRewardRoom && !restored.complete
    && restored.equityStep === REFERRAL_EQUITY_PACKETS.length && !restored.manifestReviewed
    && Boolean(progress.referralManifestCarried);
  const treatment = !inRewardRoom && !restored.complete && restored.manifestReviewed
    ? REFERRAL_TREATMENT_DOCKETS[restored.treatmentStep] : null;
  const treatmentDocket = treatment?.order === progress.referralTreatmentDocketCarried ? treatment : null;
  return {
    equityPacket,
    manifestCarried,
    treatmentDocket,
    heldItem: equityPacket ? `Equity Batch: ${equityPacket.shortLabel}`
      : manifestCarried ? "StateChat Draft Manifest"
        : treatmentDocket ? `Review Batch: ${treatmentDocket.shortLabel}` : null
  };
}

export function deriveReferralPhysicalProgress(
  progress: ReferralPhysicalProgress
): DerivedReferralPhysicalProgress {
  const complete = Boolean(progress.referralPhysicalReviewComplete || progress.referralGateOpen);
  if (complete) {
    return {
      equityStep: REFERRAL_EQUITY_PACKETS.length,
      manifestReviewed: true,
      treatmentStep: REFERRAL_TREATMENT_DOCKETS.length,
      complete: true
    };
  }

  let treatmentStep = Math.max(0, Math.min(
    REFERRAL_TREATMENT_DOCKETS.length - 1,
    Math.floor(progress.referralTreatmentStep ?? 0)
  ));
  if (progress.withholdingAppealComplete) treatmentStep = Math.max(treatmentStep, 2);
  else if (progress.foreignGovernmentPermissionComplete) treatmentStep = Math.max(treatmentStep, 1);

  const manifestReviewed = Boolean(
    progress.referralManifestReviewComplete
    || progress.foreignGovernmentPermissionComplete
    || progress.withholdingAppealComplete
    || treatmentStep > 0
  );
  const storedEquityStep = Math.max(0, Math.min(
    REFERRAL_EQUITY_PACKETS.length,
    Math.floor(progress.referralEquityRouteStep ?? 0)
  ));
  const equityStep = progress.referralEquityRouteComplete || manifestReviewed
    ? REFERRAL_EQUITY_PACKETS.length
    : storedEquityStep;

  return { equityStep, manifestReviewed, treatmentStep, complete: false };
}
