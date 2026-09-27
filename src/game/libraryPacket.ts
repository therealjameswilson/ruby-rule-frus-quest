import { REQUEST_COLLECTION, REQUEST_SOURCE, evaluateLibraryRequest, libraryRequestReadout } from './libraryRequest';
import { COMPARISON_SOURCE, COMPARISON_CARDS, COMPARISON_LANES, COMPARISON_FOLLOWUPS, comparisonReadout, evaluateComparison } from './libraryComparison';
import { evaluateSourceNote, sourceNoteReadout } from './librarySourceNote';

export const LIBRARY_PACKET_PARTS = [
  { id: 1, label: 'Archival request', station: 0 },
  { id: 2, label: 'Evidence comparison', station: 1 },
  { id: 3, label: 'Working source note', station: 2 }
] as const;
const key = (part: string) => `libraryPacket_reagan_${part}`;
export function libraryPacketReadout(progress: Record<string, number>) {
  const request = libraryRequestReadout(progress);
  const comparison = comparisonReadout(progress);
  const note = sourceNoteReadout(progress);
  const checks = [evaluateLibraryRequest(progress), evaluateComparison(progress), evaluateSourceNote(progress)];
  const contents = [
    [`Reagan Library · ${REQUEST_COLLECTION}`, request.locator ?? 'No request locator recorded.',
      request.access === 'retrieval-pending' ? 'Open folder lead. Retrieval and document inspection remain pending.' : 'Access status needs review at the finding-aid desk.',
      'Keep the archivist retrieval and withdrawal checks open.'],
    COMPARISON_CARDS.map(card => `${card.title}: ${COMPARISON_LANES.find(l => l.id === comparison.cards.find(c => c.id === card.id)?.lane)?.label ?? 'Not yet classified'}.\n${card.text}\n${card.provenance}.`),
    [note.heading, `Source: ${note.citation}`, note.qualification]
  ];
  const sources = [
    [{ label: 'Official finding aid', url: REQUEST_SOURCE }],
    [{ label: 'Official public remarks', url: COMPARISON_SOURCE }, { label: 'Official finding aid', url: REQUEST_SOURCE }],
    note.sourceUrl ? [{ label: 'Cited source', url: note.sourceUrl }] : []
  ];
  return { filed: progress[key('filed')] === 1,
    parts: LIBRARY_PACKET_PARTS.map((part, i) => ({ ...part, ready: checks[i].ok, problem: checks[i].ok ? null : checks[i].message,
      attached: progress[key(`part_${part.id}`)] === 1, contents: contents[i], sources: sources[i] })),
    openWork: [note.lead ? note.researchLog[0] : 'Folder retrieval and withdrawal checks remain pending.', ...COMPARISON_FOLLOWUPS.map(f => `Pending: ${f.label}.`)],
    purpose: 'Research in progress · for supervisor review',
    limit: 'This packet preserves a source trail and unresolved questions. It is not a completed chapter or a cleared volume.'
  };
}
export function togglePacketPart(progress: Record<string, number>, id: number) {
  if (libraryPacketReadout(progress).filed) return;
  const part = libraryPacketReadout(progress).parts.find(p => p.id === id);
  if (!part?.ready) return;
  const k = key(`part_${id}`); progress[k] = progress[k] === 1 ? 0 : 1;
}
export function evaluateLibraryPacket(progress: Record<string, number>) {
  const packet = libraryPacketReadout(progress);
  const missing = packet.parts.find(p => !p.ready);
  if (missing) return { ok: false, message: `Revisit ${missing.label.toLowerCase()} at desk ${missing.station + 1}. ${missing.problem}` };
  const unattached = packet.parts.find(p => !p.attached);
  if (unattached) return { ok: false, message: `Attach the ${unattached.label.toLowerCase()} before sending this packet for review.` };
  return { ok: true, message: 'Research packet filed for supervisor review. Retrieval, private-record comparison, and State reporting remain open.' };
}
/** Returns true only for the first explicit, valid submission; stage/reward remain scene-owned. */
export function fileLibraryPacket(progress: Record<string, number>) {
  if (libraryPacketReadout(progress).filed || !evaluateLibraryPacket(progress).ok) return false;
  progress[key('filed')] = 1; return true;
}
