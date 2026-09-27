import { requestCatalog, evaluateLibraryRequest, libraryRequestReadout } from './libraryRequest';
import { comparisonCatalog, comparisonReadout, evaluateComparison } from './libraryComparison';
import { evaluateSourceNote, sourceNoteReadout } from './librarySourceNote';

export const LIBRARY_PACKET_PARTS = [
  { id: 1, label: 'Archival request', station: 0 },
  { id: 2, label: 'Evidence comparison', station: 1 },
  { id: 3, label: 'Working source note', station: 2 }
] as const;
const key = (part: string,library='reagan') => `libraryPacket_${library}_${part}`;
export function libraryPacketReadout(progress: Record<string, number>,library='reagan') {
  const catalog=requestCatalog(library)!,evidence=comparisonCatalog(library)!,isLog=library==='bush41';
  const request = libraryRequestReadout(progress,library);
  const comparison = comparisonReadout(progress,library);
  const note = sourceNoteReadout(progress,library);
  const checks = [evaluateLibraryRequest(progress,library), evaluateComparison(progress,library), evaluateSourceNote(progress,library)];
  const contents = [
    [`${catalog.library} · ${catalog.collection}`, request.locator ?? 'No request locator recorded.',
      request.access === 'retrieval-pending' ? (isLog?'On-site folder lead. Retrieval and document inspection remain pending.':'Open folder lead. Retrieval and document inspection remain pending.') : 'Access status needs review at the finding-aid desk.',
      'Keep the archivist retrieval and withdrawal checks open.'],
    evidence.cards.map(card => `${card.title}: ${evidence.lanes.find(l => l.id === comparison.cards.find(c => c.id === card.id)?.lane)?.label ?? 'Not yet classified'}.\n${card.text}\n${card.provenance}.`),
    [note.heading, `Source: ${note.citation}`, note.qualification]
  ];
  const sources = [
    [{ label: 'Official finding aid', url: catalog.source }],
    Array.from(new Set(evidence.cards.map(c=>c.source).filter((url):url is string=>Boolean(url)))).map(url=>({label:url===catalog.source?'Official finding aid':'Official public remarks',url})),
    note.sourceUrl ? [{ label: 'Cited source', url: note.sourceUrl }] : []
  ];
  return { filed: progress[key('filed',library)] === 1,
    parts: LIBRARY_PACKET_PARTS.map((part, i) => ({ ...part, label:isLog&&part.id===3?'Research log':part.label, ready: checks[i].ok, problem: checks[i].ok ? null : checks[i].message,
      attached: progress[key(`part_${part.id}`,library)] === 1, contents: contents[i], sources: sources[i] })),
    openWork: [note.lead ? note.researchLog[0] : 'Folder retrieval and withdrawal checks remain pending.', ...evidence.followups.map(f => `Pending: ${f.label}.`)],
    purpose: 'Research in progress · for supervisor review',
    limit: 'This packet preserves a source trail and unresolved questions. It is not a completed chapter or a cleared volume.'
  };
}
export function togglePacketPart(progress: Record<string, number>, id: number,library='reagan') {
  if (libraryPacketReadout(progress,library).filed) return;
  const part = libraryPacketReadout(progress,library).parts.find(p => p.id === id);
  if (!part?.ready) return;
  const k = key(`part_${id}`,library); progress[k] = progress[k] === 1 ? 0 : 1;
}
export function evaluateLibraryPacket(progress: Record<string, number>,library='reagan') {
  if(!['reagan','bush41'].includes(library))return {ok:false,message:'No packet task is available for this repository.'};
  const packet = libraryPacketReadout(progress,library);
  const missing = packet.parts.find(p => !p.ready);
  if (missing) return { ok: false, message: `Revisit ${missing.label.toLowerCase()} at desk ${missing.station + 1}. ${missing.problem}` };
  const unattached = packet.parts.find(p => !p.attached);
  if (unattached) return { ok: false, message: `Attach the ${unattached.label.toLowerCase()} before sending this packet for review.` };
  return { ok: true, message: library==='bush41'?'Research packet filed for supervisor review. Retrieval, individual-document examination, and State comparison remain open.':'Research packet filed for supervisor review. Retrieval, private-record comparison, and State reporting remain open.' };
}
/** Returns true only for the first explicit, valid submission; stage/reward remain scene-owned. */
export function fileLibraryPacket(progress: Record<string, number>,library='reagan') {
  if (libraryPacketReadout(progress,library).filed || !evaluateLibraryPacket(progress,library).ok) return false;
  progress[key('filed',library)] = 1; return true;
}
