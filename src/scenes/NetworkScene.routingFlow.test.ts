import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const networkSceneSource = readFileSync(new URL("./NetworkScene.ts", import.meta.url), "utf8");
const routingSource = readFileSync(new URL("../game/networkRouting.ts", import.meta.url), "utf8");
const vaultReviewSource = readFileSync(new URL("../game/classNetVaultReview.ts", import.meta.url), "utf8");

describe("NetworkScene physical routing flow", () => {
  it("routes packets in the room instead of opening the legacy seven-question quiz", () => {
    expect(networkSceneSource).toContain("handleRoutingPacketAction");
    expect(networkSceneSource).toContain("routeNetworkPacket");
    expect(networkSceneSource).not.toContain("showRouteChoice");
    expect(networkSceneSource).not.toContain("Send to OpenNet");
    expect(networkSceneSource).not.toContain("Send to ClassNet");
  });

  it("persists packet progress and carried state", () => {
    expect(networkSceneSource).toContain("sceneProgress.networkRoutingStep");
    expect(networkSceneSource).toContain("sceneProgress.networkRoutingCarried");
    expect(networkSceneSource).toContain("sceneProgress.networkRoutingComplete");
  });

  it("restores the exact room objective after DANN-E pressure", () => {
    expect(networkSceneSource).toContain("restoreObjectiveAfterDannePressure");
    expect(networkSceneSource).toContain("this.beginRouting()");
  });

  it("returns wrong-network packets to the sorter without poisoning the ending", () => {
    expect(routingSource).toContain("Packet returned to the sorter");
    expect(networkSceneSource).toContain("drawRoutingPacketAtSorter");
    expect(networkSceneSource).toContain("WRONG NETWORK");
    expect(networkSceneSource).not.toContain("recordUnresolvedEquity");
  });

  it("files ClassNet review dockets in the room instead of reopening clearance quizzes", () => {
    expect(networkSceneSource).toContain("handleClassNetVaultAction");
    expect(networkSceneSource).toContain("routeClassNetVaultDocket");
    expect(networkSceneSource).not.toContain("ChoicePrompt");
    expect(networkSceneSource).not.toContain("showClearanceProcedureChoice");
    expect(networkSceneSource).not.toContain("showEo13526ReviewChoice");
    expect(networkSceneSource).not.toContain("showDeclassificationReviewChoice");
  });

  it("persists carried docket and completed review state", () => {
    expect(networkSceneSource).toContain("sceneProgress.classNetVaultReviewStep");
    expect(networkSceneSource).toContain("sceneProgress.classNetVaultDocketCarried");
    expect(networkSceneSource).toContain("sceneProgress.classNetVaultReviewComplete");
    expect(vaultReviewSource).toContain("Docket returned to the pedestal");
  });
});
