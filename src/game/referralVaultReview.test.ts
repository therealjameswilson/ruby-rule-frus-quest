import { describe, expect, it } from "vitest";
import {
  completedReferralTreatmentChecks,
  deriveReferralPhysicalProgress,
  REFERRAL_EQUITY_PACKETS,
  REFERRAL_TREATMENT_CHECK_TOTAL,
  REFERRAL_TREATMENT_DOCKETS,
  routeReferralEquityPacket,
  routeReferralTreatmentDocket
} from "./referralVaultReview";

describe("physical Referral Vault review", () => {
  it("routes three distinct files to three agency equities", () => {
    expect(REFERRAL_EQUITY_PACKETS).toHaveLength(3);
    expect(new Set(REFERRAL_EQUITY_PACKETS.map((packet) => packet.agency)).size).toBe(3);
    let step = 0;
    for (const packet of REFERRAL_EQUITY_PACKETS) {
      const result = routeReferralEquityPacket(step, packet.id, packet.agency);
      expect(result.ok).toBe(true);
      step = result.nextStep;
    }
    expect(step).toBe(3);
  });

  it("returns a file routed to the wrong equity without advancing", () => {
    const result = routeReferralEquityPacket(0, "intelligence_annex", "DOD");
    expect(result.ok).toBe(false);
    expect(result.nextStep).toBe(0);
    expect(result.complete).toBe(false);
    expect(result.message).toContain("CIA equity desk");
  });

  it("bundles seven visible-treatment checks into three physical dockets", () => {
    expect(REFERRAL_TREATMENT_DOCKETS).toHaveLength(3);
    expect(REFERRAL_TREATMENT_CHECK_TOTAL).toBe(7);
    expect(REFERRAL_TREATMENT_DOCKETS.map((docket) => docket.checkIds.length)).toEqual([3, 3, 1]);
    expect(new Set(REFERRAL_TREATMENT_DOCKETS.map((docket) => docket.station)).size).toBe(3);
  });

  it("advances treatment only at the matching human station", () => {
    const wrong = routeReferralTreatmentDocket(1, "appeal_record", "bracket_press");
    expect(wrong.ok).toBe(false);
    expect(wrong.nextStep).toBe(1);

    let step = 0;
    for (const docket of REFERRAL_TREATMENT_DOCKETS) {
      const result = routeReferralTreatmentDocket(step, docket.id, docket.station);
      expect(result.ok).toBe(true);
      step = result.nextStep;
      expect(result.complete).toBe(step === REFERRAL_TREATMENT_DOCKETS.length);
    }
    expect(completedReferralTreatmentChecks(step)).toBe(7);
  });

  it("restores physical progress from new and legacy completion flags", () => {
    expect(deriveReferralPhysicalProgress({})).toEqual({
      equityStep: 0,
      manifestReviewed: false,
      treatmentStep: 0,
      complete: false
    });
    expect(deriveReferralPhysicalProgress({ referralEquityRouteStep: 2 }).equityStep).toBe(2);
    expect(deriveReferralPhysicalProgress({ foreignGovernmentPermissionComplete: 1 })).toMatchObject({
      equityStep: 3,
      manifestReviewed: true,
      treatmentStep: 1
    });
    expect(deriveReferralPhysicalProgress({ withholdingAppealComplete: 1 })).toMatchObject({
      equityStep: 3,
      manifestReviewed: true,
      treatmentStep: 2
    });
    expect(deriveReferralPhysicalProgress({ referralGateOpen: 1 })).toEqual({
      equityStep: 3,
      manifestReviewed: true,
      treatmentStep: 3,
      complete: true
    });
  });
});
