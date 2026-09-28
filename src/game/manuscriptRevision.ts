/** Fictional continuation of the chapter desk. These are exercise records, not archival quotations. */
export const REVIEW_NOTES = [
  {id:'coverage',bit:1,author:'Supervisor · first review',text:'Footnote 2 jumps from the resource shortfall to a claimed resolution. Locate a follow-up report before closing this gap.'},
  {id:'support',bit:2,author:'General Editor · second review',text:'“Fully resolved” exceeds the evidence supplied. Revise the annotation against a specific passage and retain numbered backup.'}
] as const;
export const REVISION_SOURCES = [
  {id:1,title:'Routing slip',locator:'Exercise D · page 1',lines:['The report was forwarded to the responsible office.','A copy was filed with the correspondence.']},
  {id:2,title:'Follow-up report',locator:'Exercise E · page 2',lines:['Field staff received the instruction on Day 7.','The resource shortfall continued; further assistance was requested.']},
  {id:3,title:'File cover',locator:'Exercise F · cover',lines:['Implementation correspondence, Days 1–9.','Includes reports, instructions, and routing slips.']}
] as const;
export const ORIGINAL_REVIEW_NOTE = 'The resource shortfall was fully resolved.';
export const REVISED_REVIEW_NOTE = 'The follow-up report stated: “The resource shortfall continued; further assistance was requested.”';
type Progress = Record<string,number>;
export function readReviewNote(progress:Progress,bit:1|2){progress.compilerRevisionRead=((progress.compilerRevisionRead??0)&3)|bit;}
export function chooseRevisionSource(progress:Progress,id:number){
  if(!REVISION_SOURCES.some(s=>s.id===id)||progress.compilerRevisionSource===id)return;
  progress.compilerRevisionSource=id;delete progress.compilerRevisionLine;delete progress.compilerRevisionApplied;
}
export function markRevisionPassage(progress:Progress,line:0|1){
  if(!REVISION_SOURCES.some(s=>s.id===progress.compilerRevisionSource))return;
  progress.compilerRevisionLine=line+1;delete progress.compilerRevisionApplied;
}
export function revisionEvidence(progress:Readonly<Progress>){
  if(progress.compilerSop_first_review!==1||progress.compilerSop_second_review!==1)return {ok:false,message:'Keep the review copy intact until both reviews are complete.'};
  if((progress.compilerRevisionRead??0)!==3)return {ok:false,message:'Read both reviewers’ margin comments before revising.'};
  if(progress.compilerRevisionSource!==2)return {ok:false,message:'A routing slip or file cover cannot establish what happened. Open the follow-up report.'};
  if(progress.compilerRevisionLine!==2)return {ok:false,message:'The receipt date does not answer the coverage gap. Mark the passage about the continuing shortfall.'};
  return {ok:true,message:'This passage supports a correction and supplies the missing follow-up evidence.'};
}
export function applyManuscriptRevision(progress:Progress){
  const result=revisionEvidence(progress);if(result.ok)progress.compilerRevisionApplied=1;return result;
}
export function evaluateManuscriptRevision(progress:Readonly<Progress>){
  const result=revisionEvidence(progress);if(!result.ok)return result;
  if(progress.compilerRevisionApplied!==1)return {ok:false,message:'Review the proposed wording, then apply the correction to your revision copy.'};
  if(progress.compilerRevisionBackup!==1)return {ok:false,message:'Attach Exercise E, page 2, passage 2 as backup 2 so the revised quotation is checkable.'};
  return {ok:true,message:'Both comments addressed. The revision copy has the corrected footnote and numbered backup; the original review copy is preserved.'};
}
export function manuscriptRevisionReadout(progress:Readonly<Progress>){
  const source=REVISION_SOURCES.find(s=>s.id===progress.compilerRevisionSource);
  const applied=progress.compilerRevisionApplied===1&&revisionEvidence(progress).ok;
  return {illustrativeExhibits:true,originalReviewCopy:ORIGINAL_REVIEW_NOTE,
    comments:REVIEW_NOTES.map(n=>({...n,read:Boolean((progress.compilerRevisionRead??0)&n.bit)})),
    source:source?.id??null,locator:source?.locator??null,excerpt:source?.lines??null,
    highlightedLine:progress.compilerRevisionLine===1?0:progress.compilerRevisionLine===2?1:null,
    markedEvidence:source&&(progress.compilerRevisionLine===1||progress.compilerRevisionLine===2)
      ?{locator:source.locator,line:progress.compilerRevisionLine,text:source.lines[progress.compilerRevisionLine-1]}:null,
    applied,revisionCopy:applied?REVISED_REVIEW_NOTE:ORIGINAL_REVIEW_NOTE,
    backupAttached:progress.compilerRevisionBackup===1,complete:progress.compilerSop_revision===1};
}
