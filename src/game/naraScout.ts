/** Scout's published hash contract and supported dates checked 2026-09-29. */
export const NARA_SCOUT_URL = 'https://therealjameswilson.github.io/nara-scout/';
export const isNaraVisit = (id: string) => id === 'nara' || id === 'college-park';
export function naraScoutUrl(query = '') {
  const params = new URLSearchParams({from:'1989',to:'2001',scope:'bush41,clinton'});
  if(query)params.set('q',query);
  return `${NARA_SCOUT_URL}#${params}`;
}
export const NARA_SCOUT_STEPS = [
  'Find leads: enter terms from your research plan, then select Search in Scout. Compare agency and presidential records.',
  'Check access: separate declassified records, withdrawal sheets / MDR candidates, and unprocessed series. A result is not proof of full release.',
  'Keep a source trail: record the NAID, repository, series, box / folder, document date, access status and follow-up. Confirm where the records are held before requesting them.'
];
