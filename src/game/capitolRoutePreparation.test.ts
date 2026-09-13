import { describe, expect, it } from "vitest";
import { capitolRoutePreparation } from "./gameplayMapFlow";

describe("Capitol route preparation", () => {
  it("warns an unarmed explorer without locking exploration", () => {
    expect(capitolRoutePreparation(false, false)).toEqual({ text: "FOR COMBAT: BRING FOLDER", ready: false });
  });
  it("recognizes a held folder even before it is equipped", () => {
    expect(capitolRoutePreparation(true, false)).toEqual({ text: "REVIEW FOLDER READY", ready: true });
  });
  it.each([false, true])("prioritizes a cleared encounter with folder held = %s", held => {
    expect(capitolRoutePreparation(held, true)).toEqual({ text: "DANN-E CLEARED", ready: true });
  });
});
