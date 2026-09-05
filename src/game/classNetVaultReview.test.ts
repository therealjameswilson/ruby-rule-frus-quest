import { describe, expect, it } from "vitest";
import {
  CLASSNET_VAULT_CHECK_TOTAL,
  CLASSNET_VAULT_DOCKETS,
  classNetBatchDocketAfterRoute,
  classNetVaultObjective,
  completedClassNetVaultChecks,
  deriveClassNetVaultStep,
  getClassNetVaultDocket,
  routeClassNetVaultDocket
} from "./classNetVaultReview";

describe("physical ClassNet Vault review", () => {
  it("names each carry destination without truncation and retains reward/exit goals", () => {
    const destinations = ["HUMAN DESK", "RELEASE BOARD", "LEDGER"];
    for (const [step, docket] of CLASSNET_VAULT_DOCKETS.entries()) {
      const pickup = classNetVaultObjective(step, false, false);
      const carry = classNetVaultObjective(step, true, false);
      expect(pickup).toBe(step === 0 ? "TAKE REVIEW BATCH" : `RESUME ${docket.order}/3 AT PED`);
      expect(carry).toBe(`${docket.order}/3 TO ${destinations[step]}`);
      expect(pickup.length).toBeLessThanOrEqual(20);
      expect(carry.length).toBeLessThanOrEqual(20);
    }
    expect(classNetVaultObjective(3, false, false)).toBe("TAKE CLEARANCE TOKEN");
    expect(classNetVaultObjective(3, false, true)).toBe("EXIT EAST - REFERRAL");
  });

  it("bundles all nine source-backed checks into three physical dockets", () => {
    expect(CLASSNET_VAULT_DOCKETS).toHaveLength(3);
    expect(CLASSNET_VAULT_CHECK_TOTAL).toBe(9);
    expect(CLASSNET_VAULT_DOCKETS.map((docket) => docket.checkIds.length)).toEqual([3, 3, 3]);
    expect(new Set(CLASSNET_VAULT_DOCKETS.map((docket) => docket.station)).size).toBe(3);
  });

  it("returns a docket filed at the wrong station without advancing", () => {
    const result = routeClassNetVaultDocket(0, "clearance_lane", "decision_ledger");
    expect(result.ok).toBe(false);
    expect(result.nextStep).toBe(0);
    expect(result.complete).toBe(false);
    expect(result.message).toContain("Human Review Desk");
    expect(result.message).toContain("remains in hand");
    expect(classNetBatchDocketAfterRoute(result)?.id).toBe("clearance_lane");
  });

  it("hands off the next docket without another pedestal trip", () => {
    const first = routeClassNetVaultDocket(0, "clearance_lane", "human_desk");
    expect(classNetBatchDocketAfterRoute(first)?.id).toBe("release_standard");
    const final = routeClassNetVaultDocket(2, "decision_trail", "decision_ledger");
    expect(classNetBatchDocketAfterRoute(final)).toBeNull();
  });

  it("completes only after every docket reaches its matching station", () => {
    let step = 0;
    for (const docket of CLASSNET_VAULT_DOCKETS) {
      expect(getClassNetVaultDocket(step).id).toBe(docket.id);
      const result = routeClassNetVaultDocket(step, docket.id, docket.station);
      expect(result.ok).toBe(true);
      step = result.nextStep;
      expect(result.complete).toBe(step === CLASSNET_VAULT_DOCKETS.length);
    }
    expect(completedClassNetVaultChecks(step)).toBe(9);
  });

  it("restores progress from legacy completed review phases", () => {
    expect(deriveClassNetVaultStep({})).toBe(0);
    expect(deriveClassNetVaultStep({ clearanceProcedureComplete: 1 })).toBe(1);
    expect(deriveClassNetVaultStep({ eo13526ReviewComplete: 1 })).toBe(2);
    expect(deriveClassNetVaultStep({ declassificationReviewComplete: 1 })).toBe(3);
    expect(deriveClassNetVaultStep({ classNetVaultReviewComplete: 1 })).toBe(3);
    expect(deriveClassNetVaultStep({ classNetVaultReviewStep: 3 })).toBe(3);
  });
});
