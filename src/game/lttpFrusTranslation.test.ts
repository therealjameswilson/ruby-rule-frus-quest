import { describe, expect, it } from "vitest";
import {
  FRUS_DANNE_EGO_BOLT_SLOT_COUNT,
  FRUS_TEMPORARY_EFFECT_SLOT_COUNT,
  getLttpFrusTranslationReadout,
  LTTP_FRUS_SOURCE_REPO,
  LTTP_FRUS_TRANSLATION_PATTERNS
} from "./lttpFrusTranslation";

describe("LttP to FRUS translation", () => {
  it("records the external disassembly as a mechanics reference, not an asset source", () => {
    const readout = getLttpFrusTranslationReadout();

    expect(readout.sourceRepo).toEqual(LTTP_FRUS_SOURCE_REPO);
    expect(readout.sourceRepo.url).toBe("https://github.com/JaredBrian/AsarUSALTTPDisassembly");
    expect(readout.sourceRepo.studiedFiles).toEqual(["Bank08.asm", "Bank1D.asm", "Bank1F.asm"]);
    expect(readout.legalBoundary).toContain("no Nintendo code");
    expect(readout.legalBoundary).toContain("no Nintendo");
  });

  it("maps each studied pattern to a concrete FRUS mechanic", () => {
    expect(LTTP_FRUS_TRANSLATION_PATTERNS).toHaveLength(6);
    expect(new Set(LTTP_FRUS_TRANSLATION_PATTERNS.map((pattern) => pattern.id)).size).toBe(
      LTTP_FRUS_TRANSLATION_PATTERNS.length
    );
    expect(new Set(LTTP_FRUS_TRANSLATION_PATTERNS.map((pattern) => pattern.frusMechanicId)).size).toBe(
      LTTP_FRUS_TRANSLATION_PATTERNS.length
    );
    expect(LTTP_FRUS_TRANSLATION_PATTERNS.map((pattern) => pattern.sourceFile).sort()).toEqual([
      "Bank08.asm",
      "Bank08.asm",
      "Bank08.asm",
      "Bank08.asm",
      "Bank1D.asm",
      "Bank1F.asm"
    ]);
    expect(LTTP_FRUS_TRANSLATION_PATTERNS.every((pattern) => pattern.frusTranslation.includes("FRUS"))).toBe(true);
    expect(LTTP_FRUS_TRANSLATION_PATTERNS.every((pattern) => pattern.gameplayPayoff.length > 20)).toBe(true);
  });

  it("encodes fixed process-effect slots for readable DANN-E pressure", () => {
    const readout = getLttpFrusTranslationReadout();

    expect(FRUS_TEMPORARY_EFFECT_SLOT_COUNT).toBe(10);
    expect(FRUS_DANNE_EGO_BOLT_SLOT_COUNT).toBe(4);
    expect(readout.processEffectSlotModel).toEqual({
      maxTemporaryEffectSlots: 10,
      activeExample: "DANN-E Ego bolts use 4 of those slots at most."
    });
    expect(readout.patterns.find((pattern) => pattern.id === "fixed_ancilla_slots")).toMatchObject({
      frusMechanicId: "process_effect_slots",
      sourceSymbol: "AncillaObjectAllocation"
    });
  });
});
