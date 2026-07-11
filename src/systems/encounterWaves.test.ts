import { describe, expect, it } from "vitest";
import {
  completeEncounterWaveQueue,
  createEncounterWaveQueue,
  ENCOUNTER_WAVE_PAUSE_MS,
  EncounterWaveTransition,
  hasPendingEncounterWaves,
  nextEncounterWave,
  resolveEncounterCompletion
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

describe("EncounterWaveTransition", () => {
  it("opens one deterministic breathing window before the next wave", () => {
    const transition = new EncounterWaveTransition();

    expect(transition.begin(1000)).toBe(true);
    expect(transition.begin(1010)).toBe(false);
    expect(transition.pending).toBe(true);
    expect(transition.consumeIfReady(1000 + ENCOUNTER_WAVE_PAUSE_MS - 1)).toBe(false);
    expect(transition.consumeIfReady(1000 + ENCOUNTER_WAVE_PAUSE_MS)).toBe(true);
    expect(transition.pending).toBe(false);
    expect(transition.consumeIfReady(9999)).toBe(false);
  });

  it("resets a pending transition without spawning a wave", () => {
    const transition = new EncounterWaveTransition();
    transition.begin(100, 0);

    transition.reset();

    expect(transition.pending).toBe(false);
    expect(transition.consumeIfReady(100)).toBe(false);
  });
});

describe("resolveEncounterCompletion", () => {
  it("does not clear a room during the pause before a pending wave", () => {
    expect(resolveEncounterCompletion(2, 1, false, true)).toEqual({
      required: 2,
      defeated: 1,
      cleared: false
    });
  });

  it("clears only after the full staged encounter is defeated", () => {
    expect(resolveEncounterCompletion(2, 2, false, false)).toEqual({
      required: 2,
      defeated: 2,
      cleared: true
    });
  });

  it("restores complete counts for a persisted cleared room", () => {
    expect(resolveEncounterCompletion(4, 0, true, false)).toEqual({
      required: 4,
      defeated: 4,
      cleared: true
    });
  });
});
