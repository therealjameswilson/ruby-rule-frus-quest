/** Invented exercise exhibits: no historical person, volume, or archival quote. */
export const CHAPTER_EXHIBITS = [
  {id:'A',number:1,title:'Memorandum of conversation',dateLabel:'Conversation date',event:'Day 1',prepared:'Written up on Day 5',locator:'Exercise A · page 1',
    lines:['Participants weighed the proposal and raised objections.','No final decision was reached.']},
  {id:'B',number:2,title:'Approved instruction',dateLabel:'Issued',event:'Day 3',prepared:'Draft prepared on Day 2',locator:'Exercise B · page 1',
    lines:['The proposal is approved for implementation.','Report any obstacles through the responsible office.']},
  {id:'C',number:3,title:'Implementation report',dateLabel:'Report date',event:'Day 6',prepared:'Filed on Day 6',locator:'Exercise C · page 2',
    lines:['The field office acknowledged receipt of the instruction.','Field staff reported a resource shortfall.']}
] as const;
export const CHAPTER_ANNOTATION = 'The implementation report noted “a resource shortfall.”';
export const CHAPTER_COMPONENTS = [
  {id:'documents',bit:1,title:'Documents 1–3',detail:'Chronological sequence with each source locator preserved.'},
  {id:'annotations',bit:2,title:'Chapter annotation file',detail:'One chapter file; footnote 1 points to its supporting passage.'},
  {id:'backup',bit:4,title:'Numbered backup · 1',detail:'Exercise C, page 2. The quoted passage is highlighted.'}
] as const;
export type ExhibitId = typeof CHAPTER_EXHIBITS[number]['id'];
export function chapterOrder(progress:Readonly<Record<string,number>>):ExhibitId[]{
  const digits=String(progress.compilerAssemblyOrder??312).split('').map(Number);
  if(digits.length!==3||new Set(digits).size!==3||digits.some(n=>n<1||n>3))return ['C','A','B'];
  return digits.map(n=>CHAPTER_EXHIBITS[n-1].id);
}
export function moveChapterExhibit(progress:Record<string,number>,id:ExhibitId,direction:-1|1){
  const order=chapterOrder(progress), index=order.indexOf(id),target=index+direction;
  if(index<0||target<0||target>=order.length)return false;
  [order[index],order[target]]=[order[target],order[index]];
  progress.compilerAssemblyOrder=Number(order.map(id=>CHAPTER_EXHIBITS.find(e=>e.id===id)!.number).join(''));
  return true;
}
export function evaluateChapterChronology(progress:Readonly<Record<string,number>>){
  return chapterOrder(progress).join('')==='ABC'
    ?{ok:true,message:'Discussion → decision → implementation. Record dates stay visible alongside event dates.'}
    :{ok:false,message:'Follow the documented events: the discussion comes before the instruction, then the report. A later write-up date does not make the discussion a later event.'};
}
export function selectChapterSource(progress:Record<string,number>,id:ExhibitId){
  const source=CHAPTER_EXHIBITS.find(e=>e.id===id)!.number;
  if(progress.compilerAssemblySource===source)return;
  progress.compilerAssemblySource=source;
  // A mark on a different exhibit cannot silently become evidence here.
  delete progress.compilerAssemblyLine;
}
export function highlightChapterLine(progress:Record<string,number>,line:0|1){
  if(!CHAPTER_EXHIBITS.some(e=>e.number===progress.compilerAssemblySource))return false;
  progress.compilerAssemblyLine=line+1;return true;
}
export function evaluateChapterEvidence(progress:Readonly<Record<string,number>>){
  if(progress.compilerAssemblySource!==3)return {ok:false,message:'The note quotes the implementation report. Select that record, not the earlier discussion or instruction.'};
  if(progress.compilerAssemblyLine!==2)return {ok:false,message:'Highlight the passage that actually supports “a resource shortfall.” A source title alone cannot support a quotation.'};
  return {ok:true,message:'Footnote 1 linked to Exercise C, page 2, with the supporting passage marked.'};
}
export function toggleChapterComponent(progress:Record<string,number>,bit:1|2|4){
  progress.compilerAssemblyContents=((progress.compilerAssemblyContents??0)&7)^bit;
}
export function chapterAssemblyReadout(progress:Readonly<Record<string,number>>){
  const order=chapterOrder(progress);
  const chronologyReady=evaluateChapterChronology(progress).ok,evidenceReady=evaluateChapterEvidence(progress).ok;
  const requested=Math.max(0,Math.min(2,Math.floor(progress.compilerAssemblyStep||0)));
  const step=!chronologyReady?0:!evidenceReady?Math.min(1,requested):requested;
  return {step,order,chronologyReady,evidenceReady,
    annotation:CHAPTER_ANNOTATION,
    exhibits:CHAPTER_EXHIBITS.map(e=>({id:e.id,title:e.title,dateLabel:e.dateLabel,event:e.event,prepared:e.prepared,locator:e.locator})),
    selectedExcerpt:CHAPTER_EXHIBITS.find(e=>e.number===progress.compilerAssemblySource)?.lines??null,
    source:CHAPTER_EXHIBITS.find(e=>e.number===progress.compilerAssemblySource)?.id??null,
    highlightedLine:progress.compilerAssemblyLine===1?0:progress.compilerAssemblyLine===2?1:null,
    components:CHAPTER_COMPONENTS.map(c=>({id:c.id,title:c.title,attached:Boolean((progress.compilerAssemblyContents??0)&c.bit)})),
    chapterSubmitted:progress.compilerSop_backup===1,illustrativeExhibits:true};
}
export function advanceChapterAssembly(progress:Record<string,number>){
  const state=chapterAssemblyReadout(progress);
  const result=state.step===0?evaluateChapterChronology(progress):state.step===1?evaluateChapterEvidence(progress):evaluateChapterPacket(progress);
  if(result.ok&&state.step<2)progress.compilerAssemblyStep=state.step+1;
  return result;
}
export function evaluateChapterPacket(progress:Readonly<Record<string,number>>){
  const chronology=evaluateChapterChronology(progress);if(!chronology.ok)return chronology;
  const evidence=evaluateChapterEvidence(progress);if(!evidence.ok)return evidence;
  if(((progress.compilerAssemblyContents??0)&7)!==7)return {ok:false,message:'The supervisor needs the documents, chapter annotation file, and numbered backup together. Attach the missing parts.'};
  return {ok:true,message:'Chapter packet ready for first review. Your supervisor can follow the chronology and check footnote 1 against its highlighted backup.'};
}
