import { REQUEST_SOURCE, requestLocator } from './libraryRequest';

export const COMPARISON_SOURCE = 'https://www.reaganlibrary.gov/archives/speech/remarks-following-discussions-prime-minister-margaret-thatcher-united-kingdom';
export const COMPARISON_LANES = [
  { id: 1, label: 'Archival lead' },
  { id: 2, label: 'Public statement' },
  { id: 3, label: 'Unresolved question' }
] as const;
/** Paraphrases of official metadata and public remarks, not invented private records. */
export const COMPARISON_CARDS = [
  { id: 1, title: 'A folder for the visit', provenance: 'Finding aid · RAC Box 6 · p. 14',
    text: 'The inventory lists Thatcher’s February 20, 1985 visit folder as OPEN. It does not mark this entry DIGITIZED.',
    citation: requestLocator(2)!, source: REQUEST_SOURCE, lane: 1,
    feedback: 'A finding aid points to a folder. It does not establish what the leaders said inside the meeting.' },
  { id: 2, title: 'Reagan on INF deployments', provenance: 'Public remarks · February 20, 1985 · Reagan paragraph 3',
    text: 'Reagan publicly said he and Thatcher agreed that NATO’s INF deployments should continue on schedule under the 1979 alliance decision.',
    citation: 'Remarks Following Discussions With Prime Minister Margaret Thatcher of the United Kingdom, February 20, 1985; Reagan’s remarks.',
    source: COMPARISON_SOURCE, lane: 2,
    feedback: 'This records Reagan’s public presentation. Keep that attribution; it is not a transcript of private bargaining.' },
  { id: 3, title: 'Thatcher on arms reductions', provenance: 'Same public appearance · Thatcher paragraph 4',
    text: 'Thatcher described a shared wish to reduce nuclear weapons while maintaining balance and security.',
    citation: 'Same February 20, 1985 public remarks; Thatcher’s remarks.', source: COMPARISON_SOURCE, lane: 2,
    feedback: 'Thatcher’s own public words add her perspective. The two speakers appear in one public event, not two independent private records.' },
  { id: 4, title: 'Did their private discussions match?', provenance: 'Compiler’s research question · not a document',
    text: 'Did the private exchanges reveal qualifications or disagreements absent from the public remarks?',
    citation: 'No private meeting record has been examined at this desk.', source: null, lane: 3,
    feedback: 'The available evidence does not settle this question. Preserve it as unfinished research.' }
] as const;
export const COMPARISON_FOLLOWUPS = [
  { id: 1, label: 'Locate and examine the February 20 meeting record', detail: 'Compare the private discussion with the public presentation; retain any access limits.' },
  { id: 2, label: 'Seek contemporaneous State and embassy reporting', detail: 'Check other perspectives and follow-through before making a broader interpretation.' }
] as const;
const key = (part: string) => `libraryComparison_reagan_${part}`;
export function comparisonReadout(progress: Record<string, number>) {
  return { cards: COMPARISON_CARDS.map(card => ({ id: card.id, lane: progress[key(`card_${card.id}`)] ?? 0 })),
    followups: COMPARISON_FOLLOWUPS.filter(f => progress[key(`followup_${f.id}`)] === 1).map(f => f.id) };
}
export function classifyComparisonCard(progress: Record<string, number>, id: number, lane: number) {
  if (!COMPARISON_CARDS.some(c => c.id === id) || !COMPARISON_LANES.some(l => l.id === lane)) return;
  progress[key(`card_${id}`)] = lane;
}
export function toggleComparisonFollowup(progress: Record<string, number>, id: number) {
  if (!COMPARISON_FOLLOWUPS.some(f => f.id === id)) return;
  const k = key(`followup_${id}`); progress[k] = progress[k] === 1 ? 0 : 1;
}
export function evaluateComparison(progress: Record<string, number>) {
  const state = comparisonReadout(progress);
  for (const card of COMPARISON_CARDS) {
    const placed = state.cards.find(c => c.id === card.id)!;
    if (!placed.lane) return { ok: false, message: `Place “${card.title}” in the comparison table.`, card: card.id };
    if (placed.lane !== card.lane) return { ok: false, message: card.feedback, card: card.id };
  }
  if (state.followups.length !== COMPARISON_FOLLOWUPS.length) return { ok: false, message: 'Carry both requests forward: the private meeting record and State/embassy reporting.', card: null };
  return { ok: true, message: 'Comparison filed: attributed public positions, a folder lead, and an open question. Private-record and cross-repository work remain pending.', card: null };
}
