import { COMPARISON_SOURCE, COMPARISON_FOLLOWUPS, comparisonCatalog } from './libraryComparison';
import { REQUEST_COLLECTION, REQUEST_SOURCE, requestLocator, requestCatalog } from './libraryRequest';

export const SOURCE_NOTE_TITLE = 'Remarks Following Discussions With Prime Minister Margaret Thatcher of the United Kingdom';
export const SOURCE_NOTE_FIELDS = [
  { id: 'kind', title: 'Identify the document', help: 'The official page records a public appearance by two speakers.',
    choices: [{ value: 1, label: 'Public remarks by Reagan and Thatcher', text: 'Public remarks by President Ronald Reagan and Prime Minister Margaret Thatcher' },
      { value: 2, label: 'Memorandum of their private conversation', text: 'Memorandum of private conversation between Reagan and Thatcher' }],
    feedback: 'This source is a published public appearance. A memorandum of the private conversation remains a separate research request.' },
  { id: 'date', title: 'Date the source being cited', help: 'Match the heading of the public remarks, rather than a neighboring visit folder.',
    choices: [{ value: 2, label: 'December 22, 1984', text: 'December 22, 1984' },
      { value: 1, label: 'February 20, 1985', text: 'February 20, 1985' }],
    feedback: 'The public remarks are dated February 20, 1985. The December visit is another event.' },
  { id: 'locator', title: 'Attach the source you actually used', help: 'The library website holds both catalog descriptions and published texts. They are different sources.',
    choices: [{ value: 2, label: 'Cite the RAC Box 6 visit folder as the source of these words', text: `Reagan Library, ${REQUEST_COLLECTION}, ${requestLocator(2)}.` },
      { value: 1, label: 'Cite the Library’s online Public Papers transcript', text: `Ronald Reagan Presidential Library, Public Papers, “${SOURCE_NOTE_TITLE},” February 20, 1985 (online transcript).` }],
    feedback: 'The quoted positions came from the online public remarks. RAC Box 6 is an unexamined folder lead, not the verified location of that text.' },
  { id: 'scope', title: 'Keep the interpretation within the evidence', help: 'Both speakers appear in one public event. Their remarks do not settle what happened in private.',
    choices: [{ value: 1, label: 'Attribute public positions; leave the private discussion open', text: 'The remarks record public positions at one appearance; they do not establish the full private discussion.' },
      { value: 2, label: 'Certify that all private disagreements were resolved', text: 'All private disagreements were resolved, and no further comparison is needed.' }],
    feedback: 'The public account cannot establish that every private disagreement was resolved. Keep the pending comparison visible.' }
] as const;
export type SourceNoteField = (typeof SOURCE_NOTE_FIELDS)[number]['id'];
export const BUSH41_LOG_FIELDS: readonly {id:SourceNoteField;title:string;help:string;choices:readonly {value:number;label:string;text:string}[];feedback:string}[] = [
 {id:'kind',title:'Identify what you examined',help:'You used the library inventory; no folder contents were supplied.',choices:[{value:1,label:'Repository description of Rice subject files',text:'Research-log entry for unexamined Rice subject files'},{value:2,label:'Rice memorandum stating an arms-control position',text:'Rice memorandum on arms-control policy'}],feedback:'An inventory describes holdings. It does not supply a Rice memorandum or establish its contents.'},
 {id:'date',title:'Record the limits of the dates',help:'1989–1990 appears in the collection title; individual record dates remain to be checked.',choices:[{value:2,label:'Assign 1989 to every document',text:'All documents dated 1989'},{value:1,label:'Retain collection range; individual dates pending',text:'collection titled 1989–1990 Subject Files; individual document dates pending'}],feedback:'A collection date range is not the date of every document. Record individual dates only after inspection.'},
 {id:'locator',title:'Preserve both file-unit identifiers',help:'Similar titles do not make the file units interchangeable.',choices:[{value:2,label:'Merge them as one reviewed folder',text:'Arms Control: combined reviewed folder'},{value:1,label:'Retain CF00715-001 and CF00715-002 separately',text:`George H. W. Bush Presidential Library inventory: ${requestLocator(1,'bush41')}; ${requestLocator(2,'bush41')}.`}],feedback:'Keep both local IDs and NAIDs. These are separate file-unit leads, not a verified citation to a document you read.'},
 {id:'scope',title:'Describe what remains unknown',help:'Availability metadata cannot answer a policy question.',choices:[{value:1,label:'Contents, positions and disagreements remain unverified',text:'On-site availability is recorded. Document contents, recommendations, disagreements, and withdrawals remain unverified.'},{value:2,label:'Certify that Rice and State agreed',text:'Rice and State agreed on the policy.'}],feedback:'No examined document establishes agreement. Keep the question open until the records can be compared.'}
];
export const sourceNoteFields=(library='reagan')=>library==='bush41'?BUSH41_LOG_FIELDS:SOURCE_NOTE_FIELDS;
const key = (field: string,library='reagan') => `librarySourceNote_${library}_${field}`;
export function chooseSourceNoteField(progress: Record<string, number>, field: SourceNoteField, value: number,library='reagan') {
  const spec = sourceNoteFields(library).find(f => f.id === field);
  if (spec?.choices.some(c => c.value === value)) progress[key(field,library)] = value;
}
export function toggleSourceNoteLog(progress: Record<string, number>, item: 'lead' | 'followups',library='reagan') {
  if (item !== 'lead' && item !== 'followups') return;
  progress[key(item,library)] = progress[key(item,library)] === 1 ? 0 : 1;
}
export function sourceNoteReadout(progress: Record<string, number>,library='reagan') {
  const specs=sourceNoteFields(library),isLog=library==='bush41';
  const fields = Object.fromEntries(specs.map(f => [f.id, progress[key(f.id,library)] ?? 0])) as Record<SourceNoteField, number>;
  const text = (field: SourceNoteField, fallback: string) => specs.find(f => f.id === field)!.choices.find(c => c.value === fields[field])?.text ?? fallback;
  const lead = progress[key('lead',library)] === 1, followups = progress[key('followups',library)] === 1;
  return {
    fields,
    heading: `${text('kind', '[Source type pending]')}, ${text('date', '[Date information pending]')}.`,
    citation: text('locator', isLog?'[Attach the inventory and exact file-unit leads.]':'[Attach the source used for the public remarks.]'),
    qualification: text('scope', '[Record what this source can and cannot establish.]'),
    sourceUrl: isLog?(fields.locator===1?requestCatalog('bush41')!.source:null):(fields.locator === 1 ? COMPARISON_SOURCE : fields.locator === 2 ? REQUEST_SOURCE : null),
    lead, followups,
    researchLog: [
      ...(lead ? [isLog?`Unexamined leads: ${requestLocator(1,'bush41')}; ${requestLocator(2,'bush41')}. The inventory lists On Site; retrieval and individual record inspection remain pending.`:`Unexamined lead: Reagan Library, ${REQUEST_COLLECTION}; ${requestLocator(2)}. The finding aid lists OPEN; retrieval, contents, and withdrawals remain to be checked.`] : []),
      ...(followups ? (isLog?comparisonCatalog('bush41')!.followups:COMPARISON_FOLLOWUPS).map(f => `Pending: ${f.label}.`) : [])
    ]
  };
}
export function evaluateSourceNote(progress: Record<string, number>,library='reagan') {
  if(!['reagan','bush41'].includes(library))return {ok:false,message:'No research-note task exists for this repository.',field:null};
  const note = sourceNoteReadout(progress,library);
  for (const field of sourceNoteFields(library)) {
    if (!note.fields[field.id]) return { ok: false, message: `Complete “${field.title}” before filing.`, field: field.id };
    if (note.fields[field.id] !== 1) return { ok: false, message: field.feedback, field: field.id };
  }
  if (!note.lead || !note.followups) return { ok: false, message: library==='bush41'?'Keep both unexamined leads and both pending tasks in the research log.':'Keep the folder lead and both pending document requests in the separate research log.', field: null };
  return { ok: true, message: library==='bush41'?'Research log filed. No document source note is claimed; retrieval, examination, and comparison remain pending.':'Working note filed with its actual source. The separate research log preserves unexamined holdings and pending requests for human review.', field: null };
}
