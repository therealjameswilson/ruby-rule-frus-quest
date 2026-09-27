import { REQUEST_SOURCE, requestLocator, requestCatalog } from './libraryRequest';

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
type ComparisonCard = {id:number;title:string;provenance:string;text:string;citation:string;source:string|null;lane:number;feedback:string};
type ComparisonCatalog = {subtitle:string;brief:string;taunt:string;lanes:readonly {id:number;label:string}[];cards:readonly ComparisonCard[];followups:readonly {id:number;label:string;detail:string}[];missing:string;receipt:string};
const riceSource = requestCatalog('bush41')!.source;
const bush41: ComparisonCatalog = {
  subtitle: 'Rice subject files · Build a research plan from the inventory.',
  brief: 'These cards use repository descriptions, not document transcripts. Separate a folder lead, its availability, and questions that require examining records.',
  taunt: 'DANN-E: “Arms Control on the label? Then you already know the policy!”',
  lanes: [{id:1,label:'Archival lead'},{id:2,label:'Availability metadata'},{id:3,label:'Unresolved question'}],
  cards: [
    {id:1,title:'Arms Control [1]',provenance:'Rice Subject Files · Container CF00715',text:'The library lists a file unit titled Arms Control [1], local ID CF00715-001, National Archives ID 470424829.',citation:requestLocator(1,'bush41')!,source:riceSource,lane:1,feedback:'A subject heading identifies a lead. It does not establish a policy decision or the contents of an individual document.'},
    {id:2,title:'On Site',provenance:'Repository availability field',text:'The availability field for Arms Control [1] reads On Site.',citation:'Availability metadata for CF00715-001; NAID 470424829.',source:riceSource,lane:2,feedback:'On Site describes availability. It is not evidence that you retrieved the folder, read its documents, or checked withdrawals.'},
    {id:3,title:'A neighboring file unit',provenance:'Same inventory · distinct local ID',text:'Arms Control [2] is a separate file unit: CF00715-002, NAID 470424830. Its similar title is a reason to investigate its relationship, not to assume identical contents.',citation:requestLocator(2,'bush41')!,source:riceSource,lane:1,feedback:'This is another archival lead. Its separate identifier matters; the inventory alone does not establish overlap or sequence between the files.'},
    {id:4,title:'What did Rice recommend?',provenance:'Compiler’s question · no document examined',text:'Which positions, alternatives, or disagreements appear in the records, and how do they compare with State Department reporting?',citation:'No document contents have been examined at this desk.',source:null,lane:3,feedback:'The inventory cannot answer this. Examine individual records and compare perspectives before drawing a conclusion.'}
  ],
  followups:[
    {id:1,label:'Request both file units and examine individual records',detail:'Keep their identifiers separate; record document dates, authors, provenance, and any withdrawals.'},
    {id:2,label:'Compare the resulting evidence with State reporting',detail:'Seek contemporaneous records; preserve disagreement and missing evidence rather than filling gaps from folder titles.'}
  ],
  missing:'Carry both tasks forward: examine the requested files and compare their evidence with State reporting.',
  receipt:'Research comparison saved: separate folder leads and availability metadata, with document examination and cross-repository comparison still pending.'
};
const clintonSource=requestCatalog('clinton')!.source;
const clinton: ComparisonCatalog = {
  subtitle:'Clinton–Yeltsin release · Separate provenance, coverage, and open questions.',
  brief:'The catalog describes an available release. Its metadata is useful, but the individual conversations still need to be read and compared.',
  taunt:'DANN-E: “Declassified! That means complete. Research finished!”',
  lanes:[{id:1,label:'Release provenance'},{id:2,label:'Dates and coverage'},{id:3,label:'Unresolved question'}],
  cards:[
    {id:1,title:'How this release reached the catalog',provenance:'Clinton Digital Library · item 57569',text:'Identifier 2015-0782-M-2 belongs to a Mandatory Declassification Review. The catalog distinguishes these scans from a FOIA request.',citation:'Item 57569, Identifier and Description fields.',source:clintonSource,lane:1,feedback:'MDR identifies the release process. It is not a statement about the policy discussed or proof of complete disclosure.'},
    {id:2,title:'The listed conversation span',provenance:'Catalog Description field',text:'The entry describes Clinton–Yeltsin memcons and telcons spanning April 21, 1996 through December 31, 1999.',citation:'Item 57569, Description field; release-level date coverage.',source:clintonSource,lane:2,feedback:'This is release-level coverage. Examine the individual records for their dates; the span does not prove every conversation survives or appears here.'},
    {id:3,title:'When the catalog made it available',provenance:'Catalog Date Available field',text:'The catalog gives July 13, 2018 as the date available.',citation:'Item 57569, Date Available field.',source:clintonSource,lane:2,feedback:'Availability is not the date of a conversation or necessarily the date of each declassification decision. Keep those dates distinct.'},
    {id:4,title:'Does this release settle the account?',provenance:'Compiler’s question · no individual record examined',text:'Which positions, disagreements, redactions, or missing exchanges become visible when the conversations are examined alongside other records?',citation:'Individual examination and cross-repository comparison remain pending.',source:null,lane:3,feedback:'Catalog metadata cannot settle this question. An available release still needs document-level examination and comparison.'}
  ],
  followups:[
    {id:1,label:'Examine each conversation and record its date and limits',detail:'Track memcon versus telcon, participants, source details, and any redactions; do not substitute the catalog availability date.'},
    {id:2,label:'Check gaps and compare with other contemporaneous records',detail:'Seek State and embassy reporting and relevant records outside the listed span. Preserve disagreements and unanswered questions.'}
  ],
  missing:'Carry both tasks forward: individual conversation review and research into gaps and other perspectives.',
  receipt:'Release provenance and coverage saved. Individual conversations, redactions, and cross-repository comparison remain to be examined.'
};
const bush43Source=requestCatalog('bush43')!.source;
const bush43: ComparisonCatalog = {
  subtitle:'EP-3 records · Keep processing, release, and evidence distinct.',
  brief:'This inventory reports a partial release. Classify what the inventory establishes, then keep document examination and unresolved access in the research plan.',
  taunt:'DANN-E: “215 processed! That means 215 complete records. Close the file!”',
  lanes:[{id:1,label:'Request provenance'},{id:2,label:'Release accounting'},{id:3,label:'Unresolved research'}],
  cards:[
    {id:1,title:'The request and its scope',provenance:'FOIA inventory · page 1',text:'FOIA 2017-0023-F concerns NSC records on the EP-3 collision, dated March 15–April 30, 2001.',citation:'George W. Bush Presidential Library, inventory 2017-0023-F, Scope and Content.',source:bush43Source,lane:1,feedback:'The identifier and requested span define the search context. They are not a policy conclusion or proof that every relevant record is present.'},
    {id:2,title:'What happened to the 215 assets?',provenance:'ARMS processing totals · page 2',text:'The inventory reports 177 released in full, 22 withheld in part, and 16 withheld in full: 215 processed assets altogether.',citation:'Inventory 2017-0023-F, George W. Bush Electronic Records, ARMS.',source:bush43Source,lane:2,feedback:'Processed does not mean released in full. Preserve all three categories rather than counting withheld assets as fully available evidence.'},
    {id:3,title:'The release still has an open edge',provenance:'Scope and Content caveat · page 1',text:'Some related classified records are not yet processed. The inventory directs researchers to an archivist for related materials.',citation:'Inventory 2017-0023-F, Scope and Content; modified November 17, 2025.',source:bush43Source,lane:3,feedback:'This caveat identifies unfinished access research. Unprocessed material is separate from the 16 processed assets withheld in full; do not merge those categories.'},
    {id:4,title:'Which accounts and gaps matter?',provenance:'Compiler’s question · assets unexamined',text:'What can the released records establish, what is obscured by withholding, and how does the evidence compare with other contemporaneous reporting?',citation:'Individual assets and their withholding markings have not been examined at this desk.',source:null,lane:3,feedback:'The totals cannot answer a historical question. Examine each available asset, preserve gaps, and seek other perspectives.'}
  ],
  followups:[
    {id:1,label:'Examine released assets and their withholding markings',detail:'Track individual dates, authors, record types, and redactions. Do not infer the contents of withheld material.'},
    {id:2,label:'Ask about unprocessed and related records; compare other reporting',detail:'Keep that access inquiry open while seeking State and embassy evidence and testing the emerging account.'}
  ],
  missing:'Carry both tasks forward: examine released assets and investigate unprocessed or related records.',
  receipt:'Processing categories preserved. Individual examination, access inquiries and cross-repository comparison remain open.'
};
export function comparisonCatalog(library='reagan'): ComparisonCatalog | undefined {
  if(library==='bush41')return bush41;
  if(library==='clinton')return clinton;
  if(library==='bush43')return bush43;
  if(library!=='reagan')return undefined;
  return {subtitle:'Thatcher’s February 1985 visit · Sort the evidence, then preserve the open work.',brief:'Source summaries below are paraphrases. Public remarks establish what was said publicly; a finding aid supplies a lead. Neither substitutes for examining private records.',taunt:'DANN-E: “A cordial press appearance. Every private difference settled!”',lanes:COMPARISON_LANES,cards:COMPARISON_CARDS,followups:COMPARISON_FOLLOWUPS,missing:'Carry both requests forward: the private meeting record and State/embassy reporting.',receipt:'Comparison filed: attributed public positions, a folder lead, and an open question. Private-record and cross-repository work remain pending.'};
}
const key = (part: string, library='reagan') => `libraryComparison_${library}_${part}`;
export function comparisonReadout(progress: Record<string, number>, library='reagan') {
  const catalog=comparisonCatalog(library);
  return { cards: (catalog?.cards??[]).map(card => ({ id: card.id, lane: progress[key(`card_${card.id}`,library)] ?? 0 })),
    followups: (catalog?.followups??[]).filter(f => progress[key(`followup_${f.id}`,library)] === 1).map(f => f.id) };
}
export function classifyComparisonCard(progress: Record<string, number>, id: number, lane: number, library='reagan') {
  const catalog=comparisonCatalog(library);
  if (!catalog?.cards.some(c => c.id === id) || !catalog.lanes.some(l => l.id === lane)) return;
  progress[key(`card_${id}`,library)] = lane;
}
export function toggleComparisonFollowup(progress: Record<string, number>, id: number, library='reagan') {
  if (!comparisonCatalog(library)?.followups.some(f => f.id === id)) return;
  const k = key(`followup_${id}`,library); progress[k] = progress[k] === 1 ? 0 : 1;
}
export function evaluateComparison(progress: Record<string, number>, library='reagan') {
  const catalog=comparisonCatalog(library),state = comparisonReadout(progress,library);
  if(!catalog)return {ok:false,message:'No comparison is available for this repository.',card:null};
  for (const card of catalog.cards) {
    const placed = state.cards.find(c => c.id === card.id)!;
    if (!placed.lane) return { ok: false, message: `Place “${card.title}” in the comparison table.`, card: card.id };
    if (placed.lane !== card.lane) return { ok: false, message: card.feedback, card: card.id };
  }
  if (state.followups.length !== catalog.followups.length) return { ok: false, message:catalog.missing, card: null };
  return { ok: true, message:catalog.receipt, card: null };
}
