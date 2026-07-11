import { describe, expect, it } from "vitest";
import {
  completeEncounterWaveQueue,
  createEncounterWaveQueue,
  hasPendingEncounterWaves,
  nextEncounterWave
} from "./encounterWaves";

describe("encounterWaves", () => {
  it("preserves the full encounter count while yielding one wave at a time", () => {
    const initial = createEncounterWaveQueue([["mark-i"], ["swarm", "cloud"]]);

    expect(initial.totalWaves).toBe(2);
    expect(initial.totalEntries).toBe(3);
    expect(initial.currentWave).toBe(0);

    const first = nextEncounterWave(initial);
    expect(first?.wave).toEqual(["mark-i"]);
    expect(first?.queue.currentWave).toBe(1);
    expect(first && hasPendingEncounterWaves(first.queue)).toBe(true);

    const second = first ? nextEncounterWave(first.queue) : null;
    expect(second?.wave).toEqual(["swarm", "cloud"]);
    expect(second?.queue.currentWave).toBe(2);
    expect(second && hasPendingEncounterWaves(second.queue)).toBe(false);
    expect(second && nextEncounterWave(second.queue)).toBeNull();
  });

  it("handles rooms without a staged encounter", () => {
    const queue = createEncounterWaveQueue<string>([]);

    expect(queue.totalEntries).toBe(0);
    expect(queue.totalWaves).toBe(0);
    expect(nextEncounterWave(queue)).toBeNull();
  });

  it("preserves totals while exhausting a previously cleared encounter", () => {
    const complete = completeEncounterWaveQueue(createEncounterWaveQueue([["prime"], ["cloud"]]));

    expect(complete.totalEntries).toBe(2);
    expect(complete.currentWave).toBe(2);
    expect(hasPendingEncounterWaves(complete)).toBe(false);
  });
});
