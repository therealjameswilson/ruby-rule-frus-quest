import { describe, expect, it } from "vitest";
import { GAME_WIDTH } from "../game/constants";
import {
  PIXEL_FONT_ADVANCE,
  QUEST_BAND_LAYOUT,
  clampQuestBandText,
  questBandLayoutFits
} from "./questBandLayout";

describe("compact quest band layout", () => {
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
