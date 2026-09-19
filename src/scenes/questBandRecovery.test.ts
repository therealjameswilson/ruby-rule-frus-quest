import { describe, expect, it } from "vitest";
import { questBandRecoveryCue } from "./questBandCue";

describe("low reliability guidance", () => {
  it.each([0, 1, 20])("explains recovery at %i reliability", reliability => {
    expect(questBandRecoveryCue("explore", reliability, 40, true, null, "B"))
      .toEqual({ text: "RETURN EGO BOLTS TO HEAL", badge: "B" });
  });
  it("asks for a tool when none is equipped", () => {
    expect(questBandRecoveryCue("explore", 0, 40, false, null, "X")?.text)
      .toBe("EQUIP A TOOL TO RETURN BOLTS");
  });
  it("does not promise combat healing for editorial penalties", () => {
    expect(questBandRecoveryCue("explore", 0, 0, true, null, "X")?.text)
      .toBe("LOW RELIABILITY: REVIEW NOTES");
  });
  it("leaves healthy play, decisions and nearby interactions unobstructed", () => {
    expect(questBandRecoveryCue("explore", 21, 40, true, null, "X")).toBeNull();
    expect(questBandRecoveryCue("choice", 0, 40, true, null, "X")).toBeNull();
    expect(questBandRecoveryCue("dialog", 0, 40, true, null, "X")).toBeNull();
    expect(questBandRecoveryCue("explore", 0, 40, true, "File packet", "X")).toBeNull();
  });
});
