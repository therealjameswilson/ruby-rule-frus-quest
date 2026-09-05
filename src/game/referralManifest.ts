import { REFERRAL_EQUITY_PACKETS, type ReferralAgency, type ReferralEquityPacketId } from "./referralVaultReview";

export type ReferralManifest = Record<ReferralEquityPacketId, ReferralAgency>;
export const REFERRAL_MANIFEST_TITLE = "Review training manifest";
export const REFERRAL_MANIFEST_AGENCIES = ["CIA", "DOD", "NSC"] as const;
export const REFERRAL_MANIFEST_LABELS: Record<ReferralEquityPacketId, string> = {
  intelligence_annex: "INTEL ANNEX",
  base_access_memo: "BASE ACCESS",
  white_house_minutes: "WH MINUTES"
};

// The training draft contains a wrong destination, not an agency decision.
export function initialReferralManifest(): ReferralManifest {
  return { intelligence_annex: "CIA", base_access_memo: "DOD", white_house_minutes: "CIA" };
}

export function changeManifestRoute(manifest: ReferralManifest, id: ReferralEquityPacketId, delta: -1 | 1): ReferralManifest {
  const current = REFERRAL_MANIFEST_AGENCIES.indexOf(manifest[id]);
  const agency = REFERRAL_MANIFEST_AGENCIES[(current + delta + REFERRAL_MANIFEST_AGENCIES.length) % REFERRAL_MANIFEST_AGENCIES.length];
  return { ...manifest, [id]: agency };
}

export function firstManifestMismatch(manifest: ReferralManifest) {
  return REFERRAL_EQUITY_PACKETS.find(packet => manifest[packet.id] !== packet.agency) ?? null;
}

// Reserve zero for older saves; store three base-3 routes in sceneProgress.
export function encodeReferralManifest(manifest: ReferralManifest) {
  return 1 + REFERRAL_EQUITY_PACKETS.reduce((code, packet, index) =>
    code + REFERRAL_MANIFEST_AGENCIES.indexOf(manifest[packet.id]) * 3 ** index, 0);
}

export function restoreReferralManifest(code?: number): ReferralManifest {
  const manifest = initialReferralManifest();
  if (code === undefined || !Number.isInteger(code) || code < 1 || code > 27) return manifest;
  for (const [index, packet] of REFERRAL_EQUITY_PACKETS.entries()) {
    manifest[packet.id] = REFERRAL_MANIFEST_AGENCIES[Math.floor((code - 1) / 3 ** index) % 3];
  }
  return manifest;
}
