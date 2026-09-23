import { describe, it, expect } from "vitest";
import { ConferenceHeat, CONFERENCE_HEAT_DAMAGE } from "./conferenceHeat";
import { FRUS_ROOM_GRAPH } from "./constants";
import { canTraverseExit } from "./questArchitecture";
describe("Steve Randolph Conference Room", () => {
  it("charges exactly half a heart at each 20-second boundary", () => {
    const heat = new ConferenceHeat();
    expect(heat.advance(19_999, true)).toBe(0);
    expect(heat.secondsRemaining).toBe(1);
    expect(heat.advance(1, true) * CONFERENCE_HEAT_DAMAGE).toBe(5);
    expect(heat.secondsRemaining).toBe(20);
    expect(heat.advance(40_000, true) * CONFERENCE_HEAT_DAMAGE).toBe(10);
  });
  it("pauses without losing elapsed time and resets for a new visit", () => {
    const heat = new ConferenceHeat();
    heat.advance(10_000, true);
    expect(heat.advance(60_000, false)).toBe(0);
    expect(heat.secondsRemaining).toBe(10);
    heat.reset();
    expect(heat.advance(19_999, true)).toBe(0);
    expect(heat.advance(1, true)).toBe(1);
  });
  it("connects to the Hint Alcove with an unlocked escape route", () => {
    expect(FRUS_ROOM_GRAPH.find(room => room.id === "A3")?.exits.east).toBe("A4");
    expect(FRUS_ROOM_GRAPH.find(room => room.id === "A4")?.exits.west).toBe("A3");
    expect(canTraverseExit("A3", "east", new Set())).toBe(true);
    expect(canTraverseExit("A4", "west", new Set())).toBe(true);
  });
});
