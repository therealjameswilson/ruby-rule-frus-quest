import { describe, expect, it } from "vitest";
import { FRUS_ROOM_GRAPH } from "./constants";

const LIVE_CRITICAL_PATH = [
  ["A1", "east", "N1"],
  ["N1", "east", "N2"],
  ["N2", "east", "R1"],
  ["R1", "east", "R2"],
  ["R2", "east", "E1"],
  ["E1", "east", "S1"],
  ["S1", "east", "DV1"],
  ["DV1", "east", "G1"]
] as const;

describe("live FRUS critical-path room graph", () => {
  it.each(LIVE_CRITICAL_PATH)("routes %s %s to %s", (roomId, direction, targetId) => {
    const room = FRUS_ROOM_GRAPH.find((candidate) => candidate.id === roomId);
    expect(room, `${roomId} missing from FRUS_ROOM_GRAPH`).toBeDefined();
    expect(room?.exits[direction]).toBe(targetId);
  });

  it("keeps legacy Archive annex rooms out of the A1 main-route exit", () => {
    const sourceEntry = FRUS_ROOM_GRAPH.find((room) => room.id === "A1");
    expect(sourceEntry?.exits.east).not.toBe("A2");
    expect(FRUS_ROOM_GRAPH.some((room) => room.id === "A2")).toBe(true);
  });
});
