import { describe, expect, it } from "vitest";
import {
  CLASSNET_VAULT_CHECK_TOTAL,
  CLASSNET_VAULT_DOCKETS,
  completedClassNetVaultChecks,
  deriveClassNetVaultStep,
  getClassNetVaultDocket,
  routeClassNetVaultDocket
} from "./classNetVaultReview";

describe("physical ClassNet Vault review", () => {
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
