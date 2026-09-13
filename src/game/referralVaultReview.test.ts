import { describe, expect, it } from "vitest";
import {
  completedReferralTreatmentChecks,
  deriveReferralPhysicalProgress,
  REFERRAL_EQUITY_PACKETS,
  REFERRAL_TREATMENT_CHECK_TOTAL,
  REFERRAL_TREATMENT_DOCKETS,
  REFERRAL_TREATMENT_LABELS,
  referralReviewObjective,
  referralGuideHint,
  referralBatchPacketAfterRoute,
  referralBatchDocketAfterRoute,
  restoreReferralCarryState,
  routeReferralEquityPacket,
  routeReferralTreatmentDocket
} from "./referralVaultReview";

describe("physical Referral Vault review", () => {
  it("gives compact advice for each review stage without changing the task", () => {
    expect(referralGuideHint("equity", 0, false).short).toBe("BATCH: SOUTH TRAY");
    for (const [step, packet] of REFERRAL_EQUITY_PACKETS.entries()) {
      const hint = referralGuideHint("equity", step, true);
      expect(hint.short).toBe("BATCH: NORTH STACKS");
      expect(hint.short.length).toBeLessThanOrEqual(22);
      expect(hint.message).toContain("does not grant release approval");
    }
    expect(referralGuideHint("manifest", 0, false).short).toBe("DRAFT: STATECHAT");
    expect(referralGuideHint("manifest", 0, true).short).toBe("COPY: NORTH STACKS");
    expect(referralGuideHint("manifest", 0, true, true).short).toBe("DRAFT: HUMAN DESK");
    expect(referralGuideHint("treatment", 0, false).short).toBe("BATCH: SOUTH TRAY");
    for (const [step, docket] of REFERRAL_TREATMENT_DOCKETS.entries()) {
      const hint = referralGuideHint("treatment", step, true);
      expect(hint.short).toBe(`FILE AT ${REFERRAL_TREATMENT_LABELS[docket.station]}`);
      expect(hint.short.length).toBeLessThanOrEqual(22);
    }
    expect(referralGuideHint("complete", 3, false).short).toBe("EAST: SLIP ROOM");
  });
  it("keeps pickup, destination, retry, and handoff cues within 20 characters", () => {
    for (const [step, packet] of REFERRAL_EQUITY_PACKETS.entries()) {
      const pickup = referralReviewObjective("equity", step, false);
      const carry = referralReviewObjective("equity", step, true);
      expect(pickup).toBe("TAKE EQUITY BATCH");
      expect(carry).toBe("TO DISPATCH STACKS");
      const retry = routeReferralEquityPacket(step, packet.id, packet.agency === "CIA" ? "DOD" : "CIA");
      expect(referralReviewObjective("equity", retry.nextStep, true)).toBe(carry);
      expect(Math.max(pickup.length, carry.length)).toBeLessThanOrEqual(20);
    }
    for (const [step, docket] of REFERRAL_TREATMENT_DOCKETS.entries()) {
      expect(referralReviewObjective("treatment", step, false)).toBe("TAKE REVIEW BATCH");
      const carry = referralReviewObjective("treatment", step, true);
      expect(carry).toContain(REFERRAL_TREATMENT_LABELS[docket.station]);
      expect(carry.length).toBeLessThanOrEqual(20);
    }
    const handoffs = [
      referralReviewObjective("manifest", 0, false),
      referralReviewObjective("manifest", 0, true),
      referralReviewObjective("complete", 3, false),
      referralReviewObjective("complete", 3, false, true),
      referralReviewObjective("complete", 3, false, true, true)
    ];
    expect(handoffs).toEqual(["TAKE DRAFT AT CHAT", "DRAFT TO HUMAN DESK", "EXIT EAST - SLIP", "TAKE CONCURRENCE", "EXIT EAST - EDITOR"]);
    expect(handoffs.every((cue) => cue.length <= 20)).toBe(true);
  });

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

  it("keeps a file routed to the wrong equity in hand without advancing", () => {
    const result = routeReferralEquityPacket(0, "intelligence_annex", "DOD");
    expect(result.ok).toBe(false);
    expect(result.nextStep).toBe(0);
    expect(result.complete).toBe(false);
    expect(result.message).toContain("CIA equity desk");
    expect(result.message).toContain("remains in hand");
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

  it("hands off every next equity file and treatment docket, with no extra tray trip", () => {
    for (const [step, packet] of REFERRAL_EQUITY_PACKETS.entries()) {
      const correct = routeReferralEquityPacket(step, packet.id, packet.agency);
      expect(referralBatchPacketAfterRoute(correct)).toEqual(REFERRAL_EQUITY_PACKETS[step + 1] ?? null);
      const wrong = routeReferralEquityPacket(step, packet.id, packet.agency === "CIA" ? "DOD" : "CIA");
      expect(referralBatchPacketAfterRoute(wrong)).toEqual(packet);
    }
    for (const [step, docket] of REFERRAL_TREATMENT_DOCKETS.entries()) {
      const correct = routeReferralTreatmentDocket(step, docket.id, docket.station);
      expect(referralBatchDocketAfterRoute(correct)).toEqual(REFERRAL_TREATMENT_DOCKETS[step + 1] ?? null);
      const wrong = routeReferralTreatmentDocket(step, docket.id, docket.station === "permission_desk" ? "bracket_press" : "permission_desk");
      expect(referralBatchDocketAfterRoute(wrong)).toEqual(docket);
      expect(wrong.message).toContain("remains in hand");
    }
  });

  it.each([3, 4, -1, 0.5, NaN, Infinity])("does not award another filing for invalid or finished step %s", (step) => {
    const equity = routeReferralEquityPacket(step, "white_house_minutes", "NSC");
    const treatment = routeReferralTreatmentDocket(step, "visible_excision", "bracket_press");
    expect(equity.ok).toBe(false);
    expect(treatment.ok).toBe(false);
    expect(equity.complete).toBe(false);
    expect(treatment.complete).toBe(false);
    expect(referralBatchPacketAfterRoute(equity)).toBeNull();
    expect(referralBatchDocketAfterRoute(treatment)).toBeNull();
  });

  it("does not advance out-of-order files", () => {
    expect(routeReferralEquityPacket(0, "white_house_minutes", "NSC")).toMatchObject({ ok: false, nextStep: 0 });
    expect(routeReferralTreatmentDocket(0, "visible_excision", "bracket_press")).toMatchObject({ ok: false, nextStep: 0 });
  });

  it("restores only the current stage's carried object and readable label", () => {
    expect(restoreReferralCarryState({referralEquityRouteStep: 1, referralEquityPacketCarried: 2})).toMatchObject({
      equityPacket: REFERRAL_EQUITY_PACKETS[1], manifestCarried: false, treatmentDocket: null, heldItem: "Equity Batch: BASE"
    });
    expect(restoreReferralCarryState({referralEquityRouteComplete: 1, referralManifestCarried: 1})).toMatchObject({
      equityPacket: null, manifestCarried: true, treatmentDocket: null, heldItem: "StateChat Draft Manifest"
    });
    expect(restoreReferralCarryState({foreignGovernmentPermissionComplete: 1, referralTreatmentDocketCarried: 2})).toMatchObject({
      equityPacket: null, manifestCarried: false, treatmentDocket: REFERRAL_TREATMENT_DOCKETS[1], heldItem: "Review Batch: APPEAL"
    });
  });

  it("keeps old uncarried saves at the tray and discards stale cross-stage carry flags", () => {
    expect(restoreReferralCarryState({referralEquityRouteStep: 1}).heldItem).toBeNull();
    expect(restoreReferralCarryState({referralEquityRouteStep: 1, referralEquityPacketCarried: 1, referralManifestCarried: 1, referralTreatmentDocketCarried: 1}).heldItem).toBeNull();
    const complete = {referralPhysicalReviewComplete: 1, referralEquityPacketCarried: 3, referralManifestCarried: 1, referralTreatmentDocketCarried: 3};
    expect(restoreReferralCarryState(complete)).toEqual({equityPacket: null, manifestCarried: false, treatmentDocket: null, heldItem: null});
    expect(restoreReferralCarryState({referralEquityPacketCarried: 1}, true).heldItem).toBeNull();
  });
});
