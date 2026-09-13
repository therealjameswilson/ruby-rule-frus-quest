import { describe, expect, it } from "vitest";
import { naraRoutePreparation } from "./gameplayMapFlow";

describe("NARA route preparation", () => {
  it.each([
    [false, false, "FOR COMBAT: BRING FOLDER + STAMP"],
    [true, false, "FOR COMBAT: BRING FOLDER"],
    [false, true, "FOR COMBAT: BRING STAMP"]
  ] as const)("identifies missing counters (%s, %s)", (stamp, folder, text) => {
    expect(naraRoutePreparation(stamp, folder, false)).toEqual({ text, ready: false });
    expect(text.length * 6).toBeLessThanOrEqual(224);
  });
  it("requires both wave counters before saying ready", () => {
    expect(naraRoutePreparation(true, true, false)).toEqual({ text: "FOLDER + STAMP READY", ready: true });
  });
  it("does not demand tools for defeated patrols", () => {
    expect(naraRoutePreparation(false, false, true)).toEqual({ text: "DANN-E PATROLS CLEARED", ready: true });
  });
});
