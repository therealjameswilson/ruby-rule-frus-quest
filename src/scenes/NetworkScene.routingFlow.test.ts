import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const networkSceneSource = readFileSync(new URL("./NetworkScene.ts", import.meta.url), "utf8");
const routingSource = readFileSync(new URL("../game/networkRouting.ts", import.meta.url), "utf8");
const vaultReviewSource = readFileSync(new URL("../game/classNetVaultReview.ts", import.meta.url), "utf8");
const uiSource = readFileSync(new URL("./UIScene.ts", import.meta.url), "utf8");

function methodSource(name: string, nextName?: string) {
  const start = networkSceneSource.indexOf(`private ${name}`);
  const end = nextName ? networkSceneSource.indexOf(`private ${nextName}`, start + 1) : networkSceneSource.length;
  return networkSceneSource.slice(start, end);
}

describe("NetworkScene physical routing flow", () => {
  it("refreshes gate art immediately after either room unlocks", () => {
    const doors = methodSource("drawRoomDoors", "renderNetworkSplit");
    expect(doors).toContain("for (const object of this.roomGateObjects)");
    expect(doors).toContain("if (object.active) object.destroy()");
    expect(doors).toContain("this.roomGateObjects = []");
    expect(doors.match(/track: trackGate/g)).toHaveLength(2);
    expect(methodSource("finishRouting")).toContain("this.drawRoomDoors()");
    expect(methodSource("collectClearanceToken", "refreshClearanceTokenRouteCue")).toContain("this.drawRoomDoors()");
  });

  it("keeps the bounded destination objective visible while carrying", () => {
    expect(networkSceneSource).toContain("networkRoutingObjective(this.currentRoute, true)");
    expect(networkSceneSource).toContain("return classNetVaultObjective(");
    expect(uiSource).toContain('const hasCarryDestination = activeSceneKey === "NetworkScene"');
    expect(uiSource).toContain("gameState.heldItem && !hasCarryDestination");
  });

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

  it("restores the saved room, position, and visible carried batch", () => {
    expect(networkSceneSource).toContain('gameState.currentScene === "NetworkScene"');
    expect(networkSceneSource).toContain('gameState.roomTraversal?.currentRoomId === "N2"');
    expect(networkSceneSource).toContain("restoredPosition ?? { x: 128, y: 196 }");
    expect(methodSource("restoreHeldBatchState", "update")).toContain("Routing Batch:");
    expect(methodSource("restoreHeldBatchState", "update")).toContain("Review Batch:");
  });

  it("restores the exact room objective after DANN-E pressure", () => {
    expect(networkSceneSource).toContain("restoreObjectiveAfterDannePressure");
    expect(networkSceneSource).toContain("this.beginRouting()");
  });

  it("keeps wrong-network packets in hand for an immediate retry", () => {
    const routePacket = methodSource("routeCarriedPacket", "updateRoutingRouteText");
    expect(routingSource).toContain("Packet remains in hand");
    expect(routePacket).toContain("networkRoutingObjective(this.currentRoute, true)");
    expect(routePacket).not.toContain("this.drawRoutingPacketAtSorter()");
    expect(networkSceneSource).toContain("WRONG NETWORK");
    expect(networkSceneSource).not.toContain("recordUnresolvedEquity");
  });

  it("hands off the next routing packet without another sorter trip", () => {
    const routePacket = methodSource("routeCarriedPacket", "updateRoutingRouteText");
    expect(routePacket).toContain("networkBatchPacketAfterRoute(result)");
    expect(routePacket).toContain("this.carryRoutingPacket(nextPacket)");
    expect(routePacket).toContain("NEXT:");
  });

  it("keeps batch filing but requires one concrete accounting decision at the ledger", () => {
    expect(networkSceneSource).toContain("handleClassNetVaultAction");
    expect(networkSceneSource).toContain("routeClassNetVaultDocket");
    expect(networkSceneSource).toContain("ledgerChoice = new ChoicePrompt(this)");
    const route = methodSource("routeVaultDocket", "awardClassNetDocketPoints");
    expect(route).toContain('result.status === "review-required"');
    expect(route).toContain("CLASSNET_WITHHOLDING_REVIEW");
    expect(route).toContain("this.routeVaultDocket(station, option.value)");
    expect(route.indexOf('result.status === "review-required"')).toBeLessThan(route.indexOf("this.classNetReviewStep = result.nextStep"));
    expect(networkSceneSource).not.toContain("showClearanceProcedureChoice");
    expect(networkSceneSource).not.toContain("showEo13526ReviewChoice");
    expect(networkSceneSource).not.toContain("showDeclassificationReviewChoice");
  });

  it("freezes DANN-E and the player while reading and consumes the answer before combat", () => {
    const update = networkSceneSource.slice(networkSceneSource.indexOf("  update("));
    const choice = update.slice(update.indexOf("if (this.ledgerChoice.active)"), update.indexOf("if (input.menuJustPressed)"));
    expect(choice).toContain("this.updateDanneLurker(delta, false)");
    expect(choice).toContain("this.player.update(delta, false)");
    expect(choice).toContain("this.ledgerChoice.updateInput()");
    expect(choice).toContain("return;");
    const route = methodSource("routeVaultDocket", "awardClassNetDocketPoints");
    const rejected = route.slice(route.indexOf('result.status === "revision-required"'), route.indexOf("if (!result.ok)"));
    expect(rejected).not.toContain("adjustReliability");
    expect(rejected).not.toContain("addDocumentPoints");
    expect(rejected).toContain("saveGameNow()");
    expect(rejected).toContain("return;");
  });

  it("persists carried docket and completed review state", () => {
    expect(networkSceneSource).toContain("sceneProgress.classNetVaultReviewStep");
    expect(networkSceneSource).toContain("sceneProgress.classNetVaultDocketCarried");
    expect(networkSceneSource).toContain("sceneProgress.classNetVaultReviewComplete");
    expect(vaultReviewSource).toContain("Docket remains in hand");
  });

  it("keeps wrong dockets in hand and hands off the next one after correct filing", () => {
    const routeDocket = methodSource("routeVaultDocket", "awardClassNetDocketPoints");
    expect(routeDocket).toContain("classNetBatchDocketAfterRoute(result)");
    expect(routeDocket).toContain("this.carryVaultDocket(nextDocket)");
    expect(routeDocket).not.toContain("this.drawVaultDocketAtPedestal()");
  });

  it("keeps the routing floor readable instead of layering a poster map over play", () => {
    expect(networkSceneSource).not.toContain("addSnesWorldMap");
    expect(networkSceneSource).not.toContain("addNetworkCables");
    expect(networkSceneSource).not.toContain("addSnesRoomCompass");
    expect(networkSceneSource).not.toContain("network-routing-label-frame");
    expect(networkSceneSource).not.toContain('fontSize: "3px"');
  });

  it("moves a carried packet's interaction target from the sorter to the two terminals", () => {
    expect(networkSceneSource).toContain("const carried = this.routingCarriedPacket();");
    expect(networkSceneSource).toContain('[this.routingTerminalTarget("OpenNet"), this.routingTerminalTarget("ClassNet")]');
    expect(networkSceneSource).toContain("const destination: RoutingNetwork = target.id === \"network-opennet\"");
  });
});
