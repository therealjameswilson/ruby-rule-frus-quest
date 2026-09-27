import { COMPARISON_SOURCE, COMPARISON_FOLLOWUPS } from './libraryComparison';
import { REQUEST_COLLECTION, REQUEST_SOURCE, requestLocator } from './libraryRequest';

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
const key = (field: string) => `librarySourceNote_reagan_${field}`;
export function chooseSourceNoteField(progress: Record<string, number>, field: SourceNoteField, value: number) {
  const spec = SOURCE_NOTE_FIELDS.find(f => f.id === field);
  if (spec?.choices.some(c => c.value === value)) progress[key(field)] = value;
}
export function toggleSourceNoteLog(progress: Record<string, number>, item: 'lead' | 'followups') {
  if (item !== 'lead' && item !== 'followups') return;
  progress[key(item)] = progress[key(item)] === 1 ? 0 : 1;
}
export function sourceNoteReadout(progress: Record<string, number>) {
  const fields = Object.fromEntries(SOURCE_NOTE_FIELDS.map(f => [f.id, progress[key(f.id)] ?? 0])) as Record<SourceNoteField, number>;
  const text = (field: SourceNoteField, fallback: string) => SOURCE_NOTE_FIELDS.find(f => f.id === field)!.choices.find(c => c.value === fields[field])?.text ?? fallback;
  const lead = progress[key('lead')] === 1, followups = progress[key('followups')] === 1;
  return {
    fields,
    heading: `${text('kind', '[Document type pending]')}, ${text('date', '[Date pending]')}.`,
    citation: text('locator', '[Attach the source used for the public remarks.]'),
    qualification: text('scope', '[Record what this source can and cannot establish.]'),
    sourceUrl: fields.locator === 1 ? COMPARISON_SOURCE : fields.locator === 2 ? REQUEST_SOURCE : null,
    lead, followups,
    researchLog: [
      ...(lead ? [`Unexamined lead: Reagan Library, ${REQUEST_COLLECTION}; ${requestLocator(2)}. The finding aid lists OPEN; retrieval, contents, and withdrawals remain to be checked.`] : []),
      ...(followups ? COMPARISON_FOLLOWUPS.map(f => `Pending: ${f.label}.`) : [])
    ]
  };
}
export function evaluateSourceNote(progress: Record<string, number>) {
  const note = sourceNoteReadout(progress);
  for (const field of SOURCE_NOTE_FIELDS) {
    if (!note.fields[field.id]) return { ok: false, message: `Complete “${field.title}” before filing.`, field: field.id };
    if (note.fields[field.id] !== 1) return { ok: false, message: field.feedback, field: field.id };
  }
  if (!note.lead || !note.followups) return { ok: false, message: 'Keep the folder lead and both pending document requests in the separate research log.', field: null };
  return { ok: true, message: 'Working note filed with its actual source. The separate research log preserves unexamined holdings and pending requests for human review.', field: null };
}
