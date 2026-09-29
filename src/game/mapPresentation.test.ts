import { describe, expect, it } from 'vitest';
import { MAP_OBJECTIVES, mapQuestTitle } from './mapPresentation';
import { QUEST_BAND_LAYOUT } from '../scenes/questBandLayout';
describe('map quest titles', () => {
  it.each(Object.entries(MAP_OBJECTIVES))('fits the complete %s destination in the HUD', (_map, objective) => {
    const title = mapQuestTitle(objective);
    expect(title.length).toBeLessThanOrEqual(QUEST_BAND_LAYOUT.objective.maxChars);
    expect(title).not.toContain('...');
  });
  it('preserves combat, progress and step-closer overrides', () => {
    for (const text of ['EQUIP RED PENCIL', 'NEXT WAVE 2/3', 'Move closer to the manuscript, then press A.']) {
      expect(mapQuestTitle(text)).toBe(text);
    }
  });
});
