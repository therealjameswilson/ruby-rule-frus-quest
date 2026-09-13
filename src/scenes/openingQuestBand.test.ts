import { afterEach, describe, expect, it } from "vitest";
import { getString, LANGUAGES, setLanguage } from "../systems/i18n";
import { guideExitApproachCue, officeApproachCue, officeQuestBandObjective, guideQuestBandObjective } from "./openingQuestBand";
import { QUEST_BAND_LAYOUT, clampQuestBandText } from "./questBandLayout";

afterEach(() => setLanguage("en"));

describe("opening HUD objectives", () => {
  it("gives walking guidance only after earning the fragment and away from a reachable action", () => {
    expect(guideExitApproachCue("GuideScene", "explore", null, true))
      .toEqual({ text: "WALK THROUGH OPEN GATE", badge: "!" });
    expect(guideExitApproachCue("GuideScene", "explore", null, false)).toBeNull();
    expect(guideExitApproachCue("GuideScene", "explore", "Verification Gate", true)).toBeNull();
    expect(guideExitApproachCue("GuideScene", "dialog", null, true)).toBeNull();
    expect(guideExitApproachCue("GuideScene", "pause", null, true)).toBeNull();
    expect(guideExitApproachCue("ArchiveScene", "explore", null, true)).toBeNull();
  });
  it.each(LANGUAGES)("keeps the clean title's goal and begin command concise in %s", (language) => {
    setLanguage(language);
    for (const key of ["title.beginQuest", "title.volumeGoal"]) {
      const text = getString(key);
      expect(text).not.toBe(key);
      expect(text.length).toBeGreaterThan(0);
      expect(text.length).toBeLessThanOrEqual(26);
    }
  });
  it("shows a movement notice only when the office has no reachable action", () => {
    expect(officeApproachCue("OfficeScene", "explore", null))
      .toEqual({ text: "FOLLOW GOLD ARROW", badge: "!" });
    expect(officeApproachCue("OfficeScene", "explore", "Route Memo")).toBeNull();
    expect(officeApproachCue("OfficeScene", "dialog", null)).toBeNull();
    expect(officeApproachCue("OfficeScene", "choice", null)).toBeNull();
    expect(officeApproachCue("GuideScene", "explore", null)).toBeNull();
  });
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
    const approach = officeApproachCue("OfficeScene", "explore", null)!;
    const exit = guideExitApproachCue("GuideScene", "explore", null, true)!;
    expect(exit.text).not.toMatch(/^hud\./);
    expect(clampQuestBandText(exit.text, QUEST_BAND_LAYOUT.actionCue.maxChars)).toBe(exit.text);
    expect(exit.text).not.toBe(guideQuestBandObjective(true, true));
    expect(approach.text).not.toMatch(/^hud\./);
    expect(clampQuestBandText(approach.text, QUEST_BAND_LAYOUT.actionCue.maxChars)).toBe(approach.text);
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
