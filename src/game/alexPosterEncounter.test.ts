import { describe, expect, it } from "vitest";
import { AlexPosterEncounter } from "./alexPosterEncounter";
import { FRUS_ROOM_GRAPH } from "./constants";
import { canTraverseExit } from "./questArchitecture";
describe("Alex Poster movie encounter", () => {
  it("waits eight seconds, telegraphs, strikes, and asks about the sequel", () => {
    const e = new AlexPosterEncounter();
    e.update(7999); expect(e.phase).toBe("asking");
    e.update(1); expect(e.phase).toBe("windup");
    e.update(899); expect(e.phase).toBe("windup");
    e.update(1); expect(e.phase).toBe("attack");
    e.update(350); expect(e.phase).toBe("recovery");
    e.update(1200); expect(e.phase).toBe("asking"); expect(e.film).toBe("Best of the Best 2");
  });
  it("cancels a pending strike on response and pauses with menus", () => {
    const e = new AlexPosterEncounter(); e.update(8000); e.answer();
    expect(e.phase).toBe("asking"); expect(e.elapsed).toBe(0);
    e.update(60_000, false); expect(e.elapsed).toBe(0);
    e.answer(); expect(e.film).toBe("Best of the Best");
  });
  it("does not skip the windup after a slow frame", () => {
    const e = new AlexPosterEncounter(); e.update(60_000); expect(e.phase).toBe("windup");
  });
  it("offers an unlocked route into and out of the office", () => {
    expect(FRUS_ROOM_GRAPH.find(r => r.id === "A3")?.exits.north).toBe("A5");
    expect(FRUS_ROOM_GRAPH.find(r => r.id === "A5")?.exits.south).toBe("A3");
    expect(canTraverseExit("A3", "north", new Set())).toBe(true);
    expect(canTraverseExit("A5", "south", new Set())).toBe(true);
  });
});
