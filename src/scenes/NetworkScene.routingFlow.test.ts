import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const networkSceneSource = readFileSync(new URL("./NetworkScene.ts", import.meta.url), "utf8");
const routingSource = readFileSync(new URL("../game/networkRouting.ts", import.meta.url), "utf8");

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
});
