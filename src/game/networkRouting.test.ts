import { describe, expect, it } from "vitest";
import { createGameSaveData, gameState, resetGameState, restoreGameSaveData } from "./state";
import {
  getNetworkRoutePacket,
  NETWORK_ROUTE_ITEM_TOTAL,
  NETWORK_ROUTE_PACKETS,
  networkBatchPacketAfterRoute,
  networkRoutingObjective,
  networkRouteGuidance,
  routeNetworkPacket,
  routedItemCount
} from "./networkRouting";

describe("physical two-network routing", () => {
  it("restores a packet-specific hint without resolving any documents", () => {
    resetGameState();
    Object.assign(gameState.sceneProgress, { networkRoutingStep: 2, networkRoutingCarried: 3, networkRoutingHintOrder: 3 });
    const saved = createGameSaveData();
    resetGameState();
    restoreGameSaveData(saved);
    expect(networkRouteGuidance(gameState.sceneProgress.networkRoutingStep, gameState.sceneProgress.networkRoutingHintOrder)).toBe("ClassNet");
    expect(networkRouteGuidance(3, gameState.sceneProgress.networkRoutingHintOrder)).toBeNull();
    expect(gameState.documentCandidates).toEqual(saved.state.documentCandidates);
    expect(gameState.documentPoints).toBe(saved.state.documentPoints);
    resetGameState();
  });
  it("keeps pickup, carry, retry, and exit destinations inside the HUD", () => {
    for (const [step, packet] of NETWORK_ROUTE_PACKETS.entries()) {
      const pickup = networkRoutingObjective(step, false);
      const carry = networkRoutingObjective(step, true);
      expect(pickup).toBe(step === 0 ? "TAKE ROUTING BATCH" : `RESUME ${packet.order}/4 AT SORTER`);
      expect(carry).toContain(step === 0 ? packet.network.toUpperCase() : packet.marking);
      expect(pickup.length).toBeLessThanOrEqual(20);
      expect(carry.length).toBeLessThanOrEqual(20);
      const wrong = routeNetworkPacket(step, packet.id, packet.network === "OpenNet" ? "ClassNet" : "OpenNet");
      expect(networkRoutingObjective(wrong.nextStep, true)).toBe(carry);
    }
    expect(networkRoutingObjective(4, false)).toBe("EXIT EAST - VAULT");
  });

  it("teaches one packet, then offers a saved hint only for the current packet", () => {
    for (const [step, packet] of NETWORK_ROUTE_PACKETS.entries()) {
      expect(networkRouteGuidance(step)).toBe(step === 0 ? packet.network : null);
      expect(networkRouteGuidance(step, packet.order)).toBe(packet.network);
      expect(networkRoutingObjective(step, true, packet.order)).toBe(`${packet.order}/4 TO ${packet.network.toUpperCase()}`);
      if (step > 0) expect(networkRouteGuidance(step, packet.order - 1)).toBeNull();
      expect(packet.routingClue.length).toBeLessThan(130);
    }
    expect(networkRouteGuidance(4, 4)).toBeNull();
  });

  it("condenses the seven source items into four readable packets", () => {
    expect(NETWORK_ROUTE_PACKETS).toHaveLength(4);
    expect(NETWORK_ROUTE_ITEM_TOTAL).toBe(7);
    expect(routedItemCount(0)).toBe(0);
    expect(routedItemCount(2)).toBe(3);
    expect(routedItemCount(4)).toBe(7);
  });

  it("keeps public packets on OpenNet and protected packets on ClassNet", () => {
    expect(NETWORK_ROUTE_PACKETS.filter((packet) => packet.network === "OpenNet")).toHaveLength(2);
    expect(NETWORK_ROUTE_PACKETS.filter((packet) => packet.network === "ClassNet")).toHaveLength(2);
    expect(NETWORK_ROUTE_PACKETS.filter((packet) => packet.classification === "unclassified")).toHaveLength(2);
  });

  it("returns a wrong-network packet to the sorter without advancing", () => {
    const result = routeNetworkPacket(0, "public_research", "ClassNet");
    expect(result.ok).toBe(false);
    expect(result.nextStep).toBe(0);
    expect(result.complete).toBe(false);
    expect(result.leakRisk).toBe(false);
    expect(result.message).toContain("remains in hand");
    expect(networkBatchPacketAfterRoute(result)?.id).toBe("public_research");
  });

  it("hands off the next packet without another sorter trip", () => {
    const first = routeNetworkPacket(0, "public_research", "OpenNet");
    expect(networkBatchPacketAfterRoute(first)?.id).toBe("public_proof");
    const final = routeNetworkPacket(3, "classified_review", "ClassNet");
    expect(networkBatchPacketAfterRoute(final)).toBeNull();
  });

  it("identifies a protected packet sent to OpenNet as a leak risk", () => {
    const result = routeNetworkPacket(2, "sbu_review", "OpenNet");
    expect(result.ok).toBe(false);
    expect(result.leakRisk).toBe(true);
    expect(result.nextStep).toBe(2);
  });

  it("completes only after every packet reaches its matching network", () => {
    let step = 0;
    for (const packet of NETWORK_ROUTE_PACKETS) {
      expect(getNetworkRoutePacket(step).id).toBe(packet.id);
      const result = routeNetworkPacket(step, packet.id, packet.network);
      expect(result.ok).toBe(true);
      step = result.nextStep;
      expect(result.complete).toBe(step === NETWORK_ROUTE_PACKETS.length);
    }
    expect(step).toBe(4);
  });
});
