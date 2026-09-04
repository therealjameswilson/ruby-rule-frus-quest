import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sceneSource = readFileSync(new URL("./SilentReadScene.ts", import.meta.url), "utf8");
const reviewSource = readFileSync(new URL("../game/silentReadReview.ts", import.meta.url), "utf8");

describe("SilentReadScene physical proofing flow", () => {
  it("starts in movement mode and never opens the legacy quiz chain", () => {
    expect(sceneSource).toContain("this.startPhysicalVerificationLoop()");
    const createSource = sceneSource.slice(sceneSource.indexOf("  create()"), sceneSource.indexOf("  private resetTransientState("));
    expect(createSource).not.toContain("reviewChoice.show");
    expect(sceneSource).toContain("const decision = silentReadDecision(activeFlag.id)");
    expect(sceneSource).not.toContain("showAiAnnotationReviewChoice");
    expect(sceneSource).not.toContain("showEditorialMethodologyChoice");
    expect(sceneSource).not.toContain("showTypesetterProofChoice");
  });

  it("keeps StateChat proposal-only and makes the visible bracket a human desk action", () => {
    expect(reviewSource).toContain('id: "mechanical-fix"');
    expect(reviewSource).toContain('"visible-bracket"');
    expect(reviewSource).toContain('destination: "editor-desk"');
    expect(reviewSource).toContain('label: "[3 lines not declassified]"');
    expect(sceneSource).toContain("option.value !== decision.correctValue");
    expect(sceneSource).toContain("visible bracket added during human editor verification");
    expect(sceneSource).toContain("clearDocumentUndisclosedDeletion");
  });

  it("bundles the remaining source-backed checks into three physical publication dockets", () => {
    expect(reviewSource).toContain('id: "editorial-ledger"');
    expect(reviewSource).toContain('id: "printer-copy"');
    expect(reviewSource).toContain('id: "typesetter-proof"');
    expect(sceneSource).toContain("drawProductionLanes");
    expect(sceneSource).toContain("routeSilentReadReviewItem");
  });

  it("persists the active physical step and status while preserving legacy completion fields", () => {
    expect(sceneSource).toContain("this.resetTransientState()");
    expect(sceneSource).toContain("sceneProgress.silentReadReviewStep");
    expect(sceneSource).toContain("sceneProgress.silentReadReviewStatus");
    expect(sceneSource).toContain("sceneProgress.editorialMethodologyComplete");
    expect(sceneSource).toContain("sceneProgress.editorialTreatmentComplete");
    expect(sceneSource).toContain("sceneProgress.typeflowOrderComplete");
    expect(sceneSource).toContain("sceneProgress.typesettingPreparationComplete");
    expect(sceneSource).toContain("sceneProgress.typesetterProofComplete");
  });

  it("keeps DANN-E pressure as a toast without erasing the active route objective", () => {
    expect(sceneSource).toContain("DANN-E DEADLINE PRESSURE");
    expect(sceneSource).toContain("EGO BOLT - KEEP PROOFING");
    expect(sceneSource).not.toContain('setObjective("Silent Read Tower: dodge Ego bolts');
  });

  it("gives the intended workstation an eight-pixel mobile targeting margin", () => {
    expect(sceneSource).toContain("findActionWorkstation(activeFlag, 32)");
    expect(sceneSource).toContain("intendedDistance <= maxDistance + 8");
  });

  it("removes the route plaque when the player reaches the destination prompt", () => {
    const routeCue = sceneSource.slice(sceneSource.indexOf("  private refreshPhysicalRouteCue("), sceneSource.indexOf("  private clearPhysicalRouteCue("));
    expect(routeCue).toContain('flag.status !== "carried"');
    expect(routeCue).toContain("this.isNear(station.x, station.y, 42)");
    expect(routeCue).toMatch(/this\.clearPhysicalRouteCue\(\);\s*return;/);
  });
});
