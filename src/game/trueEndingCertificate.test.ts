import { describe, expect, it } from "vitest";
import type { ProcessStampId } from "./constants";
import { cloneDocumentCandidate, INITIAL_DOCUMENT_CANDIDATES } from "./documentWorkflow";
import { buildTrueEndingCertificate, TRUE_ENDING_TREATY_FRAGMENTS_REQUIRED } from "./trueEndingCertificate";

function resolvedDocuments() {
  return INITIAL_DOCUMENT_CANDIDATES.map((document) => ({
    ...cloneDocumentCandidate(document),
    equities: document.equities.map((equity) => ({ ...equity, response: "cleared" as const }))
  }));
}

function input(overrides: Partial<Parameters<typeof buildTrueEndingCertificate>[0]> = {}) {
  return {
    processStamps: ["rule", "archive", "sop"] satisfies ProcessStampId[],
    documentCandidates: resolvedDocuments(),
    volumeFragments: ["Front Matter Fragment", "Source Note Fragment", "Routing Fragment", "Referral Fragment", "Proof Fragment"],
    reliability: 95,
    documentPoints: 100,
    treatyFragmentsCollected: TRUE_ENDING_TREATY_FRAGMENTS_REQUIRED,
    publicationBoardCompleted: 25,
    publicationBoardTotal: 26,
    publicationApparatusCompleted: 6,
    publicationApparatusTotal: 6,
    buckramGateOpen: true,
    standardsClear: true,
    ...overrides
  };
}

describe("true ending certificate", () => {
  it("certifies the true ending only when FRUS production and the treaty record are complete", () => {
    const certificate = buildTrueEndingCertificate(input());

    expect(certificate.complete).toBe(true);
    expect(certificate.title).toBe("FRUS VOLUME CERTIFIED");
    expect(certificate.checklist.every((line) => line.complete)).toBe(true);
    expect(certificate.footer).toContain("no concealed defects");
  });

  it("blocks the true ending certificate when treaty fragments are missing", () => {
    const certificate = buildTrueEndingCertificate(input({ treatyFragmentsCollected: 2 }));

    expect(certificate.complete).toBe(false);
    expect(certificate.title).toBe("FRUS VOLUME REVIEWED");
    expect(certificate.checklist.find((line) => line.label === "TREATY RECORD")).toMatchObject({
      value: "2/3",
      complete: false
    });
  });

  it("blocks certification when standards or production gates remain open", () => {
    const certificate = buildTrueEndingCertificate(input({
      standardsClear: false,
      publicationBoardCompleted: 20,
      publicationApparatusCompleted: 5
    }));

    expect(certificate.complete).toBe(false);
    expect(certificate.checklist.find((line) => line.label === "KELLOGG STANDARDS")?.complete).toBe(false);
    expect(certificate.checklist.find((line) => line.label === "APPARATUS")?.complete).toBe(false);
    expect(certificate.checklist.find((line) => line.label === "PRODUCTION BOARD")?.complete).toBe(false);
  });
});
