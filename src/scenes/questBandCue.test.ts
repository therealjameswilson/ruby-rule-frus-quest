import { describe, expect, it } from "vitest";
import { questBandCoverFragmentSlots, questBandCrystalSlots, questBandCueLine, questBandVerbCode } from "./questBandCue";

describe("quest band cue helpers", () => {
  it("compresses long adventure verbs into SNES-sized badge codes", () => {
    expect(questBandVerbCode("EXPLORE")).toBe("GO");
    expect(questBandVerbCode("UNLOCK")).toBe("LOCK");
    expect(questBandVerbCode("CHOOSE")).toBe("PICK");
    expect(questBandVerbCode("RETURN")).toBe("RET");
    expect(questBandVerbCode("ACT")).toBe("ACT");
  });

  it("builds a compact cue line without duplicate badge prefixes", () => {
    expect(questBandCueLine({ text: "A RESEARCH TABLE" })).toBe("A RESEARCH TABLE");
    expect(questBandCueLine({ text: "[GOAL] NEXT Controls logged." })).toBe("NEXT Controls logged.");
    expect(questBandCueLine({
      text: "NEED TOOL: CITATION STAMP AND TOO MUCH TEXT FOR THE HUD"
    })).toHaveLength(34);
  });

  it("keeps equity crystal visibility limited to the active total", () => {
    expect(questBandCrystalSlots(0, 0).map((slot) => slot.visible)).toEqual([true, false, false, false, false]);
    expect(questBandCrystalSlots(2, 4)).toEqual([
      { index: 0, visible: true, held: true },
      { index: 1, visible: true, held: true },
      { index: 2, visible: true, held: false },
      { index: 3, visible: true, held: false },
      { index: 4, visible: false, held: false }
    ]);
    expect(questBandCrystalSlots(9, 9).filter((slot) => slot.visible)).toHaveLength(5);
  });

  it("maps FRUS cover fragments to the same five-slot SNES counter grammar", () => {
    expect(questBandCoverFragmentSlots(0, 5)).toEqual([
      { index: 0, visible: true, held: false },
      { index: 1, visible: true, held: false },
      { index: 2, visible: true, held: false },
      { index: 3, visible: true, held: false },
      { index: 4, visible: true, held: false }
    ]);
    expect(questBandCoverFragmentSlots(3, 5).filter((slot) => slot.held)).toHaveLength(3);
    expect(questBandCoverFragmentSlots(7, 7).filter((slot) => slot.visible)).toHaveLength(5);
  });
});
