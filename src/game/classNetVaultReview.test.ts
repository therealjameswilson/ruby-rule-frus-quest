import { describe, expect, it } from "vitest";
import {
  CLASSNET_VAULT_CHECK_TOTAL,
  CLASSNET_VAULT_DOCKETS,
  CLASSNET_VAULT_STATION_LABELS,
  CLASSNET_WITHHOLDING_REVIEW,
  classNetBatchDocketAfterRoute,
  classNetVaultObjective,
  completedClassNetVaultChecks,
  deriveClassNetVaultStep,
  getClassNetVaultDocket,
  routeClassNetVaultDocket
} from "./classNetVaultReview";
import { pixelFontMetrics } from "../systems/pixelFontMetrics";
import { ABOUT_SERIES_SOURCE } from "./aboutSeries";

describe("physical ClassNet Vault review", () => {
  it("names each carry destination without truncation and retains reward/exit goals", () => {
    const destinations = ["VERIFY REVIEW LANE", "CHECK RELEASE TERMS", "LOG WITHHELD RECORD"];
    for (const [step, docket] of CLASSNET_VAULT_DOCKETS.entries()) {
      const pickup = classNetVaultObjective(step, false, false);
      const carry = classNetVaultObjective(step, true, false);
      expect(pickup).toBe("TAKE REVIEW RECORDS");
      expect(carry).toBe(destinations[step]);
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
    const final = routeClassNetVaultDocket(2, "decision_trail", "decision_ledger", 2);
    expect(classNetBatchDocketAfterRoute(final)).toBeNull();
  });

  it("completes after matching stations and an explicit withholding decision", () => {
    let step = 0;
    for (const docket of CLASSNET_VAULT_DOCKETS) {
      expect(getClassNetVaultDocket(step).id).toBe(docket.id);
      const result = routeClassNetVaultDocket(step, docket.id, docket.station,
        docket.id === "decision_trail" ? 2 : undefined);
      expect(result.ok).toBe(true);
      step = result.nextStep;
      expect(result.complete).toBe(step === CLASSNET_VAULT_DOCKETS.length);
    }
    expect(completedClassNetVaultChecks(step)).toBe(9);
  });

  it("holds the final docket and reward until the compiler makes a decision", () => {
    const pending = routeClassNetVaultDocket(2, "decision_trail", "decision_ledger");
    expect(pending).toMatchObject({ ok: false, status: "review-required", nextStep: 2, complete: false });
    expect(classNetBatchDocketAfterRoute(pending)?.id).toBe("decision_trail");
    expect(completedClassNetVaultChecks(pending.nextStep)).toBe(6);
    expect(classNetVaultObjective(pending.nextStep, true, false)).toBe("LOG WITHHELD RECORD");
  });

  it.each([0, 1, 3, NaN, Infinity, 2.5])("keeps a rejected %s placement retryable", (decision) => {
    const rejected = routeClassNetVaultDocket(2, "decision_trail", "decision_ledger", decision);
    expect(rejected).toMatchObject({ ok: false, status: "revision-required", nextStep: 2, complete: false });
    expect(classNetBatchDocketAfterRoute(rejected)?.id).toBe("decision_trail");
    expect(rejected.message).toContain("chronological place");
    expect(routeClassNetVaultDocket(2, "decision_trail", "decision_ledger", 2))
      .toMatchObject({ ok: true, status: "filed", nextStep: 3, complete: true });
  });

  it("cannot use a correct answer to bypass station order or earn completion twice", () => {
    for (const step of [0, 1, 3]) {
      expect(routeClassNetVaultDocket(step, "decision_trail", "decision_ledger", 2))
        .toMatchObject({ ok: false, status: "wrong-route", nextStep: step, complete: false });
    }
    expect(routeClassNetVaultDocket(2, "decision_trail", "human_desk", 2))
      .toMatchObject({ ok: false, status: "wrong-route", nextStep: 2 });
  });

  it("keeps one source-backed case readable without the old nine-question sequence", () => {
    const review = CLASSNET_WITHHOLDING_REVIEW;
    expect(review.sourceUrl).toBe(ABOUT_SERIES_SOURCE.url);
    expect(review.evidence).toContain("TRAINING MEMO");
    for (const label of Object.values(CLASSNET_VAULT_STATION_LABELS)) {
      expect(label.length * pixelFontMetrics(8).advance).toBeLessThanOrEqual(52);
    }
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
