export const QUEST_BAND_HEIGHT = 24;
export const PIXEL_FONT_ADVANCE = 6;

export const QUEST_BAND_LAYOUT = {
  hearts: {
    x: 4,
    y: 2,
    columns: 5,
    gap: 7
  },
  objective: {
    x: 42,
    y: 2,
    width: 120,
    maxChars: 20
  },
  toolIcon: {
    x: 174,
    y: 2,
    size: 10
  },
  toolLabel: {
    right: 252,
    y: 2,
    width: 66,
    maxChars: 11
  },
  actionBadge: {
    x: 3,
    y: 16,
    width: 25,
    height: 8
  },
  actionCue: {
    x: 32,
    y: 16,
    width: 168,
    maxChars: 28
  },
  assembly: {
    x: 210,
    y: 16,
    width: 43,
    height: 7
  }
} as const;

export function clampQuestBandText(value: string, maxChars: number) {
  const text = value.replace(/\s+/g, " ").trim();
  if (text.length <= maxChars) return text;
  const cut = text.slice(0, Math.max(1, maxChars - 3));
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > Math.floor(maxChars / 2) ? cut.slice(0, lastSpace) : cut).trim()}...`;
}

export function questBandLayoutFits(gameWidth: number) {
  const objectiveRight = QUEST_BAND_LAYOUT.objective.x + QUEST_BAND_LAYOUT.objective.width;
  const toolLabelLeft = QUEST_BAND_LAYOUT.toolLabel.right - QUEST_BAND_LAYOUT.toolLabel.width;
  const actionCueRight = QUEST_BAND_LAYOUT.actionCue.x + QUEST_BAND_LAYOUT.actionCue.width;
  return objectiveRight < QUEST_BAND_LAYOUT.toolIcon.x
    && QUEST_BAND_LAYOUT.toolIcon.x + QUEST_BAND_LAYOUT.toolIcon.size < toolLabelLeft
    && actionCueRight < QUEST_BAND_LAYOUT.assembly.x
    && QUEST_BAND_LAYOUT.toolLabel.right <= gameWidth
    && QUEST_BAND_LAYOUT.assembly.x + QUEST_BAND_LAYOUT.assembly.width <= gameWidth;
}
