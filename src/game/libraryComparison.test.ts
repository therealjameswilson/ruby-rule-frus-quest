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

it('keeps Bush41 inventory findings separate from Reagan public evidence', () => {
  const progress: Record<string,number> = {};
  for(const [id,lane] of [[1,1],[2,2],[3,1],[4,3]])classifyComparisonCard(progress,id,lane,'bush41');
  toggleComparisonFollowup(progress,1,'bush41');
  expect(evaluateComparison(progress,'bush41').ok).toBe(false);
  toggleComparisonFollowup(progress,2,'bush41');
  expect(evaluateComparison(progress,'bush41').ok).toBe(true);
  expect(evaluateComparison(progress).ok).toBe(false);
  expect(comparisonReadout(progress).cards.every(c=>c.lane===0)).toBe(true);
  classifyComparisonCard(progress,3,2,'bush41');
  expect(evaluateComparison(progress,'bush41')).toMatchObject({ok:false,card:3});
  expect(evaluateComparison(progress,'unknown').ok).toBe(false);
});

it('keeps Clinton release provenance and coverage separate from historical conclusions', () => {
 const p:Record<string,number>={};
 for(const [id,lane] of [[1,1],[2,2],[3,2],[4,3]])classifyComparisonCard(p,id,lane,'clinton');
 toggleComparisonFollowup(p,1,'clinton');toggleComparisonFollowup(p,2,'clinton');
 expect(evaluateComparison(p,'clinton').ok).toBe(true);
 expect(evaluateComparison(p,'bush41').ok).toBe(false);expect(evaluateComparison(p).ok).toBe(false);
 classifyComparisonCard(p,4,2,'clinton');expect(evaluateComparison(p,'clinton')).toMatchObject({ok:false,card:4});
 classifyComparisonCard(p,4,3,'clinton');classifyComparisonCard(p,3,1,'clinton');
 expect(evaluateComparison(p,'clinton')).toMatchObject({ok:false,card:3});
 const restored=JSON.parse(JSON.stringify(p));expect(comparisonReadout(restored,'clinton').cards[2].lane).toBe(1);
});
