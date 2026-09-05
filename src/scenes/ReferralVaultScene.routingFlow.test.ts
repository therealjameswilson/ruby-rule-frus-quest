import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sceneSource = readFileSync(new URL("./ReferralVaultScene.ts", import.meta.url), "utf8");
const reviewSource = readFileSync(new URL("../game/referralVaultReview.ts", import.meta.url), "utf8");

function methodSource(name: string, nextName: string) {
  const start = sceneSource.indexOf(`private ${name}`);
  return sceneSource.slice(start, sceneSource.indexOf(`private ${nextName}`, start + 1));
}

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

  it("hands off both batches and leaves wrong files in hand", () => {
    const equity = methodSource("routeEquityPacket", "pickUpManifest");
    const treatment = methodSource("routeTreatmentDocket", "awardTreatmentDocket");
    expect(equity).toContain("this.carryEquityPacket(nextPacket)");
    expect(treatment).toContain("this.carryTreatmentDocket(nextDocket)");
    expect(equity).not.toContain("this.drawEquityPacketAtTray()");
    expect(treatment).not.toContain("this.drawTreatmentDocketAtTray()");
    for (const route of [equity, treatment]) {
      const retry = route.slice(route.indexOf("if (!result.ok)"), route.indexOf("return;", route.indexOf("if (!result.ok)")));
      expect(retry).not.toContain("setHeldItem(null)");
      expect(retry).toContain("saveGameNow()");
    }
  });

  it("restores the saved room and player before initialization clears transient state", () => {
    const create = sceneSource.slice(sceneSource.indexOf("create()"), sceneSource.indexOf("private restoreReferralProgress"));
    expect(create.indexOf("gameState.roomTraversal?.currentRoomId")).toBeLessThan(create.indexOf("setSceneState("));
    expect(create).toContain("restoredPosition ?? { x: 128, y: 192 }");
    expect(create).toContain("this.visitedRoomIds = new Set(restoredVisitedRoomIds)");
    expect(create).toContain("this.restoreHeldBatchState(restoredRoomId)");
  });

  it("saves pickups, the human review, filing, gates, and the tool without teleporting the compiler", () => {
    for (const [name, nextName] of [
      ["enterRoom", "clearRoom"], ["pickUpEquityPacket", "carryEquityPacket"],
      ["routeEquityPacket", "pickUpManifest"], ["pickUpManifest", "fileManifestAtHumanDesk"],
      ["fileManifestAtHumanDesk", "pickUpTreatmentDocket"], ["pickUpTreatmentDocket", "carryTreatmentDocket"],
      ["routeTreatmentDocket", "awardTreatmentDocket"], ["finishReferralReview", "referralObjective"],
      ["collectConcurrenceSlip", "refreshConcurrenceSlipRouteCue"]
    ]) expect(methodSource(name, nextName)).toContain("saveGameNow()");
    expect(methodSource("finishReferralReview", "referralObjective")).not.toContain("x: 128, y: 178");
  });

  it("refreshes the collected pedestal and unlocked exit before playing the slip reward", () => {
    const collect = methodSource("collectConcurrenceSlip", "refreshConcurrenceSlipRouteCue");
    expect(collect.indexOf("this.redrawReferralRoom()")).toBeGreaterThan(collect.indexOf('addProcessItem("concurrence_slip")'));
    expect(collect.indexOf("this.redrawReferralRoom()")).toBeLessThan(collect.indexOf("addSnesRewardBurst("));
  });
});
