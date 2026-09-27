import { expect, it } from 'vitest';
import { classifyComparisonCard, toggleComparisonFollowup, comparisonReadout, evaluateComparison } from './libraryComparison';

it('keeps public statements distinct from a folder lead and private evidence', () => {
  const progress: Record<string, number> = {};
  classifyComparisonCard(progress, 1, 2);
  expect(evaluateComparison(progress)).toMatchObject({ ok: false, card: 1 });
  classifyComparisonCard(progress, 1, 1);
  classifyComparisonCard(progress, 2, 2);
  classifyComparisonCard(progress, 3, 2);
  classifyComparisonCard(progress, 4, 2);
  expect(evaluateComparison(progress)).toMatchObject({ ok: false, card: 4 });
  classifyComparisonCard(progress, 4, 3);
  expect(evaluateComparison(progress)).toMatchObject({ ok: false, card: null });
  toggleComparisonFollowup(progress, 1);
  toggleComparisonFollowup(progress, 2);
  expect(evaluateComparison(progress).ok).toBe(true);
  // Evaluating a draft must not award completion or mutate its contents.
  const saved = JSON.stringify(progress);
  expect(evaluateComparison(JSON.parse(saved)).ok).toBe(true);
  expect(JSON.stringify(progress)).toBe(saved);
  expect(comparisonReadout(JSON.parse(saved)).followups).toEqual([1, 2]);
  toggleComparisonFollowup(progress, 2);
  expect(evaluateComparison(progress).ok).toBe(false);
});

it('rejects invalid card/lane input and an incomplete persisted draft', () => {
  const progress: Record<string, number> = { libraryResearch_v2_reagan: 1 };
  classifyComparisonCard(progress, 99, 1);
  classifyComparisonCard(progress, 1, 99);
  toggleComparisonFollowup(progress, 99);
  expect(progress).toEqual({ libraryResearch_v2_reagan: 1 });
  classifyComparisonCard(progress, 3, 2);
  const restored = JSON.parse(JSON.stringify(progress));
  expect(comparisonReadout(restored).cards[2].lane).toBe(2);
  expect(evaluateComparison(restored)).toMatchObject({ ok: false, card: 1 });
  expect(restored.libraryResearch_v2_reagan).toBe(1);
});
