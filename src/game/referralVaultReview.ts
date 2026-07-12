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

export function getReferralEquityPacket(step: number) {
  return REFERRAL_EQUITY_PACKETS[
    Math.max(0, Math.min(REFERRAL_EQUITY_PACKETS.length - 1, Math.floor(step)))
  ];
}

export function getReferralTreatmentDocket(step: number) {
  return REFERRAL_TREATMENT_DOCKETS[
    Math.max(0, Math.min(REFERRAL_TREATMENT_DOCKETS.length - 1, Math.floor(step)))
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
  const ok = packet.id === expected.id && agency === packet.agency;
  const nextStep = ok ? step + 1 : step;
  return {
    ok,
    packet,
    agency,
    nextStep,
    complete: ok && nextStep >= REFERRAL_EQUITY_PACKETS.length,
    message: ok
      ? `${packet.label} routed to the ${agency} equity desk.`
      : packet.id !== expected.id
        ? `${expected.label} is the next file in the referral tray.`
        : `${packet.label} belongs at the ${packet.agency} equity desk. File returned to the tray.`
  };
}

export function routeReferralTreatmentDocket(
  step: number,
  docketId: ReferralTreatmentDocketId,
  station: ReferralTreatmentStationId
): ReferralTreatmentRouteResult {
  const expected = getReferralTreatmentDocket(step);
  const docket = REFERRAL_TREATMENT_DOCKETS.find((candidate) => candidate.id === docketId) ?? expected;
  const ok = docket.id === expected.id && station === docket.station;
  const nextStep = ok ? step + 1 : step;
  return {
    ok,
    docket,
    station,
    nextStep,
    complete: ok && nextStep >= REFERRAL_TREATMENT_DOCKETS.length,
    message: ok
      ? docket.successMessage
      : docket.id !== expected.id
        ? `${expected.label} is the next visible-treatment docket.`
        : `${docket.label} belongs at the ${docket.stationLabel}. Docket returned to the tray.`
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
