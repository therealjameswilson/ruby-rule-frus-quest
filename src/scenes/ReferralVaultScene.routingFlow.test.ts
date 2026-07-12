import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sceneSource = readFileSync(new URL("./ReferralVaultScene.ts", import.meta.url), "utf8");
const reviewSource = readFileSync(new URL("../game/referralVaultReview.ts", import.meta.url), "utf8");

describe("ReferralVaultScene physical review flow", () => {
  it("routes agency files in the room instead of opening the legacy referral quiz", () => {
    expect(sceneSource).toContain("handleReferralReviewAction");
    expect(sceneSource).toContain("routeReferralEquityPacket");
    expect(sceneSource).not.toContain("ChoicePrompt");
    expect(sceneSource).not.toContain("showMatchChoice");
    expect(sceneSource).not.toContain("showManifestChoice");
  });

  it("keeps StateChat draft-only and requires a physical human handoff", () => {
    expect(sceneSource).toContain("StateChat Draft Manifest");
    expect(sceneSource).toContain("Human Concurrence Desk");
    expect(sceneSource).toContain("fileManifestAtHumanDesk");
    expect(sceneSource).not.toContain("Let StateChat decide");
  });

  it("turns permission, appeal, and visible excision into physical stations", () => {
    expect(sceneSource).toContain("routeReferralTreatmentDocket");
    expect(sceneSource).toContain("permission_desk");
    expect(sceneSource).toContain("appeal_ledger");
    expect(reviewSource).toContain('station: "bracket_press"');
    expect(sceneSource).not.toContain("showForeignGovernmentPermissionChoice");
    expect(sceneSource).not.toContain("showWithholdingAppealChoice");
    expect(sceneSource).not.toContain("showExcisionChoice");
    expect(reviewSource).toContain("[Text not declassified] printed visibly");
  });

  it("persists every carried object and completed physical stage", () => {
    expect(sceneSource).toContain("sceneProgress.referralEquityPacketCarried");
    expect(sceneSource).toContain("sceneProgress.referralManifestCarried");
    expect(sceneSource).toContain("sceneProgress.referralTreatmentDocketCarried");
    expect(sceneSource).toContain("sceneProgress.referralPhysicalReviewComplete");
    expect(sceneSource).not.toContain("recordUnresolvedEquity");
  });
});
