/** Catalog metadata from the Reagan Library VIP Visits finding aid, checked 2026-09-27.
 * Entries are leads, not transcribed document contents or a volume assignment. */
export const REQUEST_SOURCE='https://www.reaganlibrary.gov/sites/default/files/finding_aids_pdfs/219646.pdf';
export const REQUEST_COLLECTION='Executive Secretariat, NSC: VIP Visits: Records, 1981–1985';
export const REQUEST_ENTRIES=[
 {id:1,title:'United Kingdom: Prime Minister Thatcher Official Visit',date:'12/22/1984',parts:'(1)-(3)',status:'OPEN',page:13},
 {id:2,title:'United Kingdom: Prime Minister Thatcher Official Visit',date:'02/20/1985',parts:'(1)(2)',status:'OPEN',page:14},
 {id:3,title:'South Africa: Chief Buthelezi Meeting',date:'01/30/1985',parts:'',status:'OPEN / DIGITIZED',page:13}
];
export function requestLocator(id:number){const e=REQUEST_ENTRIES.find(e=>e.id===id);return e?`RAC Box 6; ${e.title}, ${e.date} ${e.parts}`.trim():null;}
const key='libraryRequest_reagan_';
export function libraryRequestReadout(p:Record<string,number>){
 const entry=REQUEST_ENTRIES.find(e=>e.id===p[key+'entry'])??null;
 return {entry,locator:requestLocator(p[key+'locator']),access:p[key+'access']===1?'retrieval-pending':p[key+'access']===2?'reviewed-online':null,retrieval:p[key+'retrieval']===1,withdrawals:p[key+'withdrawals']===1};
}
export function selectRequestEntry(p:Record<string,number>,id:number){
 if(!REQUEST_ENTRIES.some(e=>e.id===id))return;
 if(p[key+'entry']!==id){delete p[key+'locator'];delete p[key+'access'];}
 p[key+'entry']=id;
}
export function attachRequestLocator(p:Record<string,number>){if(REQUEST_ENTRIES.some(e=>e.id===p[key+'entry']))p[key+'locator']=p[key+'entry'];}
export function setRequestAccess(p:Record<string,number>,value:1|2){p[key+'access']=value;}
export function toggleRequestFollowup(p:Record<string,number>,task:'retrieval'|'withdrawals'){p[key+task]=p[key+task]===1?0:1;}
export function evaluateLibraryRequest(p:Record<string,number>){
 const s=libraryRequestReadout(p);
 if(s.entry?.id!==2)return {ok:false,message:'Match both the visitor and February 1985 date. Nearby entries can be background, but they do not answer this request.'};
 if(p[key+'locator']!==2)return {ok:false,message:'Attach the selected entry’s exact box and folder locator to the request slip.'};
 if(s.access!=='retrieval-pending')return {ok:false,message:'OPEN describes access. This entry does not claim online scans or reviewed contents; record retrieval as pending.'};
 if(!s.retrieval||!s.withdrawals)return {ok:false,message:'Add both follow-ups: confirm retrieval with the archivist and check for withdrawals when the folder arrives.'};
 return {ok:true,message:'Request filed. Folder retrieval, document inspection, and any withdrawals remain to be checked.'};
}
