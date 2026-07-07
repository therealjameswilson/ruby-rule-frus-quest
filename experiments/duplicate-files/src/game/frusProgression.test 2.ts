import { describe, expect, it } from "vitest";
import type { AgencyEquity } from "./types";
import {
  buckramGateOpen,
  compilationIsComplete,
  crystalsEarned,
  PENDANTS,
  totalEquities
} from "./frusProgression";
import type { ProcessStampId } from "./constants";
import type { PendantId } from "./frusProgression";

function equity(agencyId: string, response: AgencyEquity["response"]): AgencyEquity {
  return {
    agencyId,
    fictionalName: `${agencyId} Office`,
    issueType: "diplomatic",
    response
  };
}

describe("FRUS/Zelda progression helpers", () => {
  it("defines the three named research pendants", () => {
    const ids: PendantId[] = PENDANTS.map((pendant) => pendant.id);
    expect(ids).toEqual(["objectivity", "provenance", "review"]);
    expect(PENDANTS.map((pendant) => pendant.stampId)).toEqual(["rule", "archive", "sop"]);
  });

  it("compilationIsComplete is false until all three research pendants are held", () => {
    expect(compilationIsComplete([])).toBe(false);
    expect(compilationIsComplete(["rule", "archive"])).toBe(false);
    expect(compilationIsComplete(["rule", "archive", "sop"])).toBe(true);
    expect(compilationIsComplete(new Set<ProcessStampId>(["rule", "archive", "sop", "network"]))).toBe(true);
  });

  it("counts distinct agency-equity crystals with mixed response values", () => {
    const documents = [
      {
        equities: [
          equity("defense", "cleared"),
          equity("intelligence", "referred")
        ]
      },
      {
        equities: [
          equity("defense", "submitted"),
          equity("privacy", "resolved"),
          equity("foreign", "excised")
        ]
      },
      {
        equities: [
          equity("military", "not_submitted"),
          equity("diplomatic", "denied"),
          equity("intelligence", "resolved")
        ]
      }
    ];

    expect(totalEquities(documents)).toBe(6);
    expect(crystalsEarned(documents)).toBe(5);
  });

  it("opens the Buckram Gate only with complete pendants and all distinct equities cleared", () => {
    const completePendants: ProcessStampId[] = ["rule", "archive", "sop"];
    const incompletePendants: ProcessStampId[] = ["rule", "archive"];
    const clearedEquities = [
      { equities: [equity("defense", "cleared")] },
      { equities: [equity("intelligence", "resolved")] }
    ];
    const pendingEquities = [
      { equities: [equity("defense", "cleared")] },
      { equities: [equity("intelligence", "referred")] }
    ];

    expect(buckramGateOpen(incompletePendants, clearedEquities)).toBe(false);
    expect(buckramGateOpen(completePendants, pendingEquities)).toBe(false);
    expect(buckramGateOpen(completePendants, [])).toBe(false);
    expect(buckramGateOpen(completePendants, clearedEquities)).toBe(true);
  });
});
