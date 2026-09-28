/** An illustrative selection exercise; these packets are not historical documents. */
export const MANUSCRIPT_BASE_PAGES = 1100;
export const MANUSCRIPT_PAGE_LIMIT = 1400;
export const SELECTION_PACKETS = [
  {
    id: 'decision', title: 'The decision trail', pages: 220,
    tag: 'Decision · dissent · implementation',
    description: 'A policy instruction, the objections it overruled, and reports showing what happened next.',
    evidence: [
      {label: 'Instruction', excerpt: 'Proceed with the proposal despite the unresolved objections.'},
      {label: 'Dissent', excerpt: 'Our partners may reject the terms; consultation is incomplete.'},
      {label: 'Follow-up', excerpt: 'Partners rejected the terms. Negotiators requested revised instructions.'}
    ],
    value: 'Preserves the decision and evidence of its shortcomings.',
    flag: 'compilerDeskDecision'
  },
  {
    id: 'routine', title: 'The supporting file', pages: 180,
    tag: 'Routine reports · repeated detail',
    description: 'Daily summaries repeat facts already established in the manuscript. A few details may help an annotation.',
    evidence: [
      {label: 'Daily summary', excerpt: 'The proposal remains under discussion. No new instructions received.'},
      {label: 'Next summary', excerpt: 'Discussions continue. The instructions remain unchanged.'},
      {label: 'Useful detail', excerpt: 'The next meeting was postponed until Friday.'}
    ],
    value: 'Keep the file traceable as supporting research, even if it is not printed.',
    flag: 'compilerDeskRoutine'
  }
] as const;
export type SelectionPacketId = typeof SELECTION_PACKETS[number]['id'];
export function manuscriptSelectionReadout(progress: Readonly<Record<string, number>>) {
  const packets = SELECTION_PACKETS.map(p => ({id:p.id, title:p.title, pages:p.pages, selected:progress[p.flag]===1 || (p.id==='decision' && progress.compilerSop_selection===1 && progress[p.flag]===undefined)}));
  const pages = MANUSCRIPT_BASE_PAGES + packets.reduce((n,p)=>n+(p.selected?p.pages:0),0);
  return {basePages:MANUSCRIPT_BASE_PAGES, pageLimit:MANUSCRIPT_PAGE_LIMIT, pages,
    remaining:MANUSCRIPT_PAGE_LIMIT-pages, annotationCountsTowardLimit:false, packets};
}
export function toggleSelectionPacket(progress: Record<string, number>, id: SelectionPacketId) {
  const packet = SELECTION_PACKETS.find(p=>p.id===id)!;
  progress[packet.flag] = manuscriptSelectionReadout(progress).packets.find(p=>p.id===id)!.selected?0:1;
}
export function evaluateManuscriptSelection(progress: Readonly<Record<string, number>>) {
  const state = manuscriptSelectionReadout(progress);
  if (state.remaining<0) return {ok:false, message:`${-state.remaining} pages over the document limit. Compare what each packet contributes; retain useful unprinted evidence for annotation.`};
  if (!state.packets[0].selected) return {ok:false, message:'The manuscript is missing the decision trail. Space alone is not enough: preserve the policy decision, dissent, and implementation evidence.'};
  return {ok:true, message:'Decision trail selected. Supporting file retained for annotation and further research.'};
}
