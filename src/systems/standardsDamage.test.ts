import { describe, expect, it } from "vitest";
import type { DocumentCandidate } from "../game/types";
import {
  applyStandardsDamage,
  excisionDamage,
  VIOLATION_DAMAGE
} from "./standardsDamage";
import type { StandardViolation } from "./standardsDamage";

const ALL_VIOLATIONS = Object.keys(VIOLATION_DAMAGE) as StandardViolation[];

const excisionDocument: Pick<DocumentCandidate, "sensitivityRisk" | "annotationNeeded"> = {
  sensitivityRisk: 76,
  annotationNeeded: true
};

describe("standards damage", () => {
  it("debits reliability by the configured amount for every violation", () => {
    for (const violation of ALL_VIOLATIONS) {
      expect(applyStandardsDamage(100, violation)).toBe(100 - VIOLATION_DAMAGE[violation]);
    }
  });

  it("clamps reliability at zero after standards damage", () => {
    for (const violation of ALL_VIOLATIONS) {
      expect(applyStandardsDamage(1, violation)).toBe(0);
    }
  });

  it("charges no hearts for bracketed excision and undisclosed-deletion damage when unbracketed", () => {
    expect(excisionDamage(excisionDocument, true)).toBe(0);
    expect(excisionDamage(excisionDocument, false)).toBe(VIOLATION_DAMAGE.undisclosed_deletion);
  });
});
