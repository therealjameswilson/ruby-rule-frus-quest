import { afterEach, describe, expect, it } from "vitest";
import { getString, LANGUAGES, setLanguage } from "../systems/i18n";
import { officeQuestBandObjective, guideQuestBandObjective } from "./openingQuestBand";
import { QUEST_BAND_LAYOUT, clampQuestBandText } from "./questBandLayout";

afterEach(() => setLanguage("en"));

describe("opening HUD objectives", () => {
  it("names the destination while carrying the memo instead of truncating its title", () => {
    expect(officeQuestBandObjective({ juniorIntroduced: true, memoStatus: 1, hasArchiveKey: false }))
      .toBe("MEMO TO WEST INBOX");
  });

  it("recovers the key on older saves before directing the player south", () => {
    expect(officeQuestBandObjective({ juniorIntroduced: true, memoStatus: 3, hasArchiveKey: false }))
      .toBe("ASK JR FOR KEY");
    expect(officeQuestBandObjective({ juniorIntroduced: true, memoStatus: 3, hasArchiveKey: true }))
      .toBe("ARCHIVE - SOUTH DOOR");
  });

  it.each(LANGUAGES)("fits every opening stage in %s without losing the target", (language) => {
    setLanguage(language);
    const office = [
      { juniorIntroduced: false, memoStatus: 0, hasArchiveKey: false },
      ...[0, 1, 2, 3].map((memoStatus) => ({ juniorIntroduced: true, memoStatus, hasArchiveKey: false })),
      { juniorIntroduced: true, memoStatus: 3, hasArchiveKey: true }
    ].map(officeQuestBandObjective);
    const guide = [
      guideQuestBandObjective(false, false),
      guideQuestBandObjective(true, false),
      guideQuestBandObjective(true, false, true),
      guideQuestBandObjective(true, true)
    ];
    for (const text of [...office, ...guide]) {
      expect(text).not.toMatch(/^hud\./);
      expect(text.length).toBeGreaterThan(0);
      expect(clampQuestBandText(text, QUEST_BAND_LAYOUT.objective.maxChars)).toBe(text);
    }
    expect(new Set(office).size).toBe(6);
    expect(new Set(guide).size).toBe(4);
    for (const cue of ["guideReturned", "guideAim", "guideSwing", "guideRetry"]) {
      const text = getString(`hud.${cue}`);
      expect(text).not.toMatch(/^hud\./);
      expect(text.length).toBeLessThanOrEqual(26);
    }
  });
});
