import { describe, expect, it } from "vitest";
import {
  checkRedZoneGate,
  RED_ZONE_GATE_POINT_VALUE,
  RED_ZONE_GATE_SOURCE_URL
} from "./redZoneGate";

describe("Red Zone declassification gate", () => {
  it("blocks entry without a Clearance Token or completed declassification review", () => {
    const result = checkRedZoneGate({
      hasClearanceToken: false,
      eo13526ReviewComplete: false,
      declassificationReviewComplete: false
    });

    expect(result.ok).toBe(false);
    expect(result.shouldOpenGate).toBe(false);
    expect(result.documentPoints).toBe(0);
    expect(result.message).toContain("Clearance Token");
    expect(result.objective).toContain("E.O. 13526");
    expect(result.sourceUrl).toBe(RED_ZONE_GATE_SOURCE_URL);
  });

  it("opens when the Clearance Token is held", () => {
    const result = checkRedZoneGate({ hasClearanceToken: true });

    expect(result.ok).toBe(true);
    expect(result.shouldOpenGate).toBe(true);
    expect(result.documentPoints).toBe(RED_ZONE_GATE_POINT_VALUE);
    expect(result.sourceBasis).toContain("withheld or excised material");
  });

  it("opens from completed E.O. and declassification review even if the token was restored late", () => {
    const result = checkRedZoneGate({
      hasClearanceToken: false,
      eo13526ReviewComplete: true,
      declassificationReviewComplete: true
    });

    expect(result.ok).toBe(true);
    expect(result.shouldOpenGate).toBe(true);
  });

  it("does not farm document points after the gate has opened", () => {
    const result = checkRedZoneGate({
      alreadyOpen: true,
      hasClearanceToken: true
    });

    expect(result.ok).toBe(true);
    expect(result.shouldOpenGate).toBe(false);
    expect(result.documentPoints).toBe(0);
    expect(result.message).toContain("already open");
  });
});
