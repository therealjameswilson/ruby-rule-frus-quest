/** Historical record dates, not FOIA, catalog-update or release dates. */
export const RESEARCH_SCOPE = { startYear: 1989, endYear: 2008 } as const;
export function inResearchScope(years: readonly number[] | null | undefined): boolean {
  return !!years && years.length === 2 && years.every(Number.isInteger)
    && years[0] >= RESEARCH_SCOPE.startYear && years[1] <= RESEARCH_SCOPE.endYear
    && years[0] <= years[1];
}
