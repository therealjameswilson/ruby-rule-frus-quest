import { describe, expect, it } from "vitest";
import { GAME_WIDTH } from "../game/constants";
import { ART_PACK_SPRITE_ORIGIN_Y, CHARACTER_FRAME } from "../art/characters";
import {
  PIXEL_FONT_ADVANCE,
  QUEST_BAND_LAYOUT,
  clampQuestBandText,
  questBandOffset,
  questBandLayoutFits
} from "./questBandLayout";

describe("compact quest band layout", () => {
  it("anchors character frames on whole pixels", () => {
    expect(Number.isInteger(CHARACTER_FRAME.height * ART_PACK_SPRITE_ORIGIN_Y)).toBe(true);
  });
  it("gets out of the hero's way near northern exits without changing movement bounds", () => {
    expect(questBandOffset(42, 0, 240, true)).toBe(216);
    expect(questBandOffset(66, 0, 240, true)).toBe(216);
    expect(questBandOffset(68, 0, 240, true)).toBe(0);
  });

  it("does not flicker at the overlap boundary and returns after the hero moves away", () => {
    expect(questBandOffset(68, 216, 240, true)).toBe(216);
    expect(questBandOffset(76, 216, 240, true)).toBe(216);
    expect(questBandOffset(77, 216, 240, true)).toBe(0);
  });

  it("leaves the bottom free for dialogue and decisions", () => {
    expect(questBandOffset(42, 216, 240, false)).toBe(0);
  });

  it("reserves the touch-control area when docking on phones", () => {
    expect(questBandOffset(48, 0, 240, true, 64)).toBe(152);
    expect(questBandOffset(68, 152, 240, true, 64)).toBe(152);
    expect(questBandOffset(80, 152, 240, true, 64)).toBe(0);
  });
  it("keeps objective, tool, action, and assembly regions separate", () => {
    expect(questBandLayoutFits(GAME_WIDTH)).toBe(true);
  });

  it("fits clamped text inside its pixel-native region", () => {
    const objective = clampQuestBandText("Route the protected review packet to the ClassNet terminal", QUEST_BAND_LAYOUT.objective.maxChars);
    const action = clampQuestBandText("Take the public packet from the routing sorter", QUEST_BAND_LAYOUT.actionCue.maxChars);
    const tool = clampQuestBandText("TOOL: CONCURRENCE SLIP", QUEST_BAND_LAYOUT.toolLabel.maxChars);

    expect(objective.length * PIXEL_FONT_ADVANCE).toBeLessThanOrEqual(QUEST_BAND_LAYOUT.objective.width);
    expect(action.length * PIXEL_FONT_ADVANCE).toBeLessThanOrEqual(QUEST_BAND_LAYOUT.actionCue.width);
    expect(tool.length * PIXEL_FONT_ADVANCE).toBeLessThanOrEqual(QUEST_BAND_LAYOUT.toolLabel.width);
  });
});
