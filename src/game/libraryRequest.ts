/** Repository metadata checked 2026-09-27; entries are leads, not document contents. */
export type RequestEntry={id:number;title:string;date:string;parts:string;status:string;page?:number;locator?:string};
export type RequestCatalog={library:string;collection:string;source:string;sourceNote:string;brief:string;target:number;entries:RequestEntry[];accessLabel:string;accessHint:string;matchHint:string};
export const REQUEST_SOURCE='https://www.reaganlibrary.gov/sites/default/files/finding_aids_pdfs/219646.pdf';
export const REQUEST_COLLECTION='Executive Secretariat, NSC: VIP Visits: Records, 1981–1985';
export const REQUEST_ENTRIES:RequestEntry[]=[
 {id:1,title:'United Kingdom: Prime Minister Thatcher Official Visit',date:'12/22/1984',parts:'(1)-(3)',status:'OPEN',page:13},
 {id:2,title:'United Kingdom: Prime Minister Thatcher Official Visit',date:'02/20/1985',parts:'(1)(2)',status:'OPEN',page:14},
 {id:3,title:'South Africa: Chief Buthelezi Meeting',date:'01/30/1985',parts:'',status:'OPEN / DIGITIZED',page:13}
];
export const REQUEST_CATALOGS:Record<string,RequestCatalog>={
 reagan:{library:'Reagan Library',collection:REQUEST_COLLECTION,source:REQUEST_SOURCE,sourceNote:'RAC Box 6 · Selected finding-aid entries, pages 13–14.',brief:'Trace Thatcher’s February 1985 visit. Match visitor and date; a finding aid describes folders, not what their documents establish.',target:2,entries:REQUEST_ENTRIES,accessLabel:'Open folder lead · retrieval and contents pending',accessHint:'OPEN describes access. This entry does not claim online scans or reviewed contents; record retrieval as pending.',matchHint:'Match both the visitor and February 1985 date. Nearby entries can be background, but they do not answer this request.'},
 bush41:{library:'George H. W. Bush Library',collection:'Records of the National Security Council: Condoleezza Rice 1989–1990 Subject Files',source:'https://www.bush41library.gov/digital-research-room/finding-aid/foia/records-condoleezza-rice-files',sourceNote:'Container CF00715 · Local identifiers and National Archives IDs.',brief:'Begin with Arms Control [1] in Rice’s subject files. Request that file unit precisely; the three neighboring entries have similar titles but different identifiers.',target:1,
 entries:[
  {id:1,title:'Arms Control [1]',date:'CF00715-001',parts:'NAID 470424829',status:'On Site',locator:'Condoleezza Rice 1989–1990 Subject Files; CF00715-001, Arms Control [1]; NAID 470424829'},
  {id:2,title:'Arms Control [2]',date:'CF00715-002',parts:'NAID 470424830',status:'On Site',locator:'Condoleezza Rice 1989–1990 Subject Files; CF00715-002, Arms Control [2]; NAID 470424830'},
  {id:3,title:'Arms Control [3]',date:'CF00715-003',parts:'NAID 470424831',status:'On Site',locator:'Condoleezza Rice 1989–1990 Subject Files; CF00715-003, Arms Control [3]; NAID 470424831'}
 ],accessLabel:'On-site lead · retrieval and contents pending',accessHint:'On Site is an availability listing. It does not establish that you retrieved or reviewed any documents online.',matchHint:'Request Arms Control [1]. Match the local ID and NAID as well as the title; neighboring file units are separate requests.'}
};
export const requestCatalog=(library='reagan')=>REQUEST_CATALOGS[library];
export function requestLocator(id:number,library='reagan'){const e=requestCatalog(library)?.entries.find(e=>e.id===id);return e?(e.locator??`RAC Box 6; ${e.title}, ${e.date} ${e.parts}`.trim()):null;}
const key=(library:string)=>`libraryRequest_${library}_`;
export function libraryRequestReadout(p:Record<string,number>,library='reagan'){
 const k=key(library),entry=requestCatalog(library)?.entries.find(e=>e.id===p[k+'entry'])??null;
 return {entry,locator:requestLocator(p[k+'locator'],library),access:p[k+'access']===1?'retrieval-pending':p[k+'access']===2?'reviewed-online':null,retrieval:p[k+'retrieval']===1,withdrawals:p[k+'withdrawals']===1};
}
export function selectRequestEntry(p:Record<string,number>,id:number,library='reagan'){
 if(!requestCatalog(library)?.entries.some(e=>e.id===id))return;
 const k=key(library);if(p[k+'entry']!==id){delete p[k+'locator'];delete p[k+'access'];}p[k+'entry']=id;
}
export function attachRequestLocator(p:Record<string,number>,library='reagan'){const k=key(library);if(requestCatalog(library)?.entries.some(e=>e.id===p[k+'entry']))p[k+'locator']=p[k+'entry'];}
export function setRequestAccess(p:Record<string,number>,value:1|2,library='reagan'){p[key(library)+'access']=value;}
export function toggleRequestFollowup(p:Record<string,number>,task:'retrieval'|'withdrawals',library='reagan'){const k=key(library);p[k+task]=p[k+task]===1?0:1;}
export function evaluateLibraryRequest(p:Record<string,number>,library='reagan'){
 const catalog=requestCatalog(library),s=libraryRequestReadout(p,library);
 if(!catalog)return {ok:false,message:'No request catalog is available for this repository.'};
 if(s.entry?.id!==catalog.target)return {ok:false,message:catalog.matchHint};
 if(p[key(library)+'locator']!==catalog.target)return {ok:false,message:'Attach the selected entry’s exact box and folder locator to the request slip.'};
 if(s.access!=='retrieval-pending')return {ok:false,message:catalog.accessHint};
 if(!s.retrieval||!s.withdrawals)return {ok:false,message:'Add both follow-ups: confirm retrieval with the archivist and check for withdrawals when the folder arrives.'};
 return {ok:true,message:'Request filed. Folder retrieval, document inspection, and any withdrawals remain to be checked.'};
}
