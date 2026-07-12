import { describe, expect, it } from "vitest";
import {
  getNetworkRoutePacket,
  NETWORK_ROUTE_ITEM_TOTAL,
  NETWORK_ROUTE_PACKETS,
  routeNetworkPacket,
  routedItemCount
} from "./networkRouting";

describe("physical two-network routing", () => {
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
