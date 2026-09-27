/** Repository metadata checked 2026-09-27; entries are leads, not document contents. */
export type RequestEntry={id:number;title:string;date:string;parts:string;status:string;page?:number;locator?:string};
export type RequestCatalog={library:string;collection:string;source:string;sourceNote:string;brief:string;target:number;entries:RequestEntry[];accessLabel:string;accessHint:string;matchHint:string;accessState?:string;followups?:[string,string];provenance?:{correct:string;wrong:string;hint:string};releaseSummary?:string};
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
 ],accessLabel:'On-site lead · retrieval and contents pending',accessHint:'On Site is an availability listing. It does not establish that you retrieved or reviewed any documents online.',matchHint:'Request Arms Control [1]. Match the local ID and NAID as well as the title; neighboring file units are separate requests.'},
 clinton:{library:'Clinton Library',collection:'Clinton Presidential Records: NSC Cable, Email, and Records Management System',source:'https://clinton.presidentiallibraries.us/items/show/57569',sourceNote:'Digital Library item 57569 · MDR 2015-0782-M-2.',brief:'Prepare to examine the Clinton–Yeltsin memcons and telcons. Preserve the release identifier and its date coverage before opening individual records.',target:1,
 entries:[{id:1,title:'Declassified Documents Concerning Russian President Boris Yeltsin',date:'April 21, 1996–December 31, 1999',parts:'2015-0782-M-2 · item 57569',status:'Scanned MDR documents',locator:'Clinton Digital Library item 57569; MDR 2015-0782-M-2; Clinton–Yeltsin memcons and telcons, April 21, 1996–December 31, 1999'}],
 accessLabel:'Scans available · individual documents not yet examined',accessState:'released-not-reviewed',accessHint:'A scanned release is available, but this catalog inspection has not examined its individual documents.',matchHint:'Open the Clinton–Yeltsin release entry before preparing the research log.',
 provenance:{correct:'Mandatory Declassification Review (MDR)',wrong:'Freedom of Information Act request (FOIA)',hint:'The catalog explicitly identifies an MDR and says these scans are not associated with a FOIA request.'},
 followups:['Examine each memcon/telcon and record its individual date','Inspect redactions and identify gaps outside the listed date span']},
 bush43:{library:'George W. Bush Library',collection:'George W. Bush Presidential Electronic Records: NSC EP-3 collision records',source:'https://www.georgewbushlibrary.gov/media/7324',sourceNote:'FOIA inventory 2017-0023-F · pages 1–2 · modified November 17, 2025.',brief:'Prepare the EP-3 research log. Read the release breakdown before treating the processed electronic records as a complete account.',target:1,
 entries:[{id:1,title:'NSC records on the April 2001 EP-3 collision',date:'March 15–April 30, 2001',parts:'FOIA 2017-0023-F · ARMS',status:'215 processed assets · partial withholding',page:2,locator:'George W. Bush Presidential Electronic Records; FOIA 2017-0023-F; ARMS; March 15–April 30, 2001'}],
 accessLabel:'Partial release · individual assets not yet examined',accessState:'partial-release-not-reviewed',accessHint:'The inventory reports withheld and unprocessed material. A release inventory does not prove that all documents are available or reviewed.',matchHint:'Open the EP-3 release inventory before preparing the research log.',
 provenance:{correct:'Freedom of Information Act request (FOIA)',wrong:'Mandatory Declassification Review (MDR)',hint:'The inventory is identified as FOIA 2017-0023-F; retain that request identifier.'},
 releaseSummary:'215 processed assets: 177 released in full, 22 withheld in part, 16 withheld in full. Some related classified records remain unprocessed.',
 followups:['Inspect released assets and their individual withholding markings','Ask the archivist about related and still-unprocessed records']}

};
export const requestCatalog=(library='reagan')=>Object.prototype.hasOwnProperty.call(REQUEST_CATALOGS,library)?REQUEST_CATALOGS[library]:undefined;
export function requestLocator(id:number,library='reagan'){const e=requestCatalog(library)?.entries.find(e=>e.id===id);return e?(e.locator??`RAC Box 6; ${e.title}, ${e.date} ${e.parts}`.trim()):null;}
const key=(library:string)=>`libraryRequest_${library}_`;
export function libraryRequestReadout(p:Record<string,number>,library='reagan'){
 const k=key(library),entry=requestCatalog(library)?.entries.find(e=>e.id===p[k+'entry'])??null;
 return {entry,locator:requestLocator(p[k+'locator'],library),provenance:p[k+'provenance']===1?'verified':p[k+'provenance']===2?'mislabeled':null,releaseLogged:p[k+'release']===1,access:p[k+'access']===1?(requestCatalog(library)?.accessState??'retrieval-pending'):p[k+'access']===2?'reviewed-online':null,retrieval:p[k+'retrieval']===1,withdrawals:p[k+'withdrawals']===1};
}
export function selectRequestEntry(p:Record<string,number>,id:number,library='reagan'){
 if(!requestCatalog(library)?.entries.some(e=>e.id===id))return;
 const k=key(library);if(p[k+'entry']!==id){delete p[k+'locator'];delete p[k+'access'];delete p[k+'provenance'];delete p[k+'release'];}p[k+'entry']=id;
}
export function attachRequestLocator(p:Record<string,number>,library='reagan'){const k=key(library);if(requestCatalog(library)?.entries.some(e=>e.id===p[k+'entry']))p[k+'locator']=p[k+'entry'];}
export function setRequestAccess(p:Record<string,number>,value:1|2,library='reagan'){p[key(library)+'access']=value;}
export function toggleRequestFollowup(p:Record<string,number>,task:'retrieval'|'withdrawals',library='reagan'){const k=key(library);p[k+task]=p[k+task]===1?0:1;}
export function setRequestProvenance(p:Record<string,number>,value:1|2,library:string){p[key(library)+'provenance']=value;}
export function logRequestRelease(p:Record<string,number>,library:string){if(requestCatalog(library)?.releaseSummary)p[key(library)+'release']=1;}
export function evaluateLibraryRequest(p:Record<string,number>,library='reagan'){
 const catalog=requestCatalog(library),s=libraryRequestReadout(p,library);
 if(!catalog)return {ok:false,message:'No request catalog is available for this repository.'};
 if(s.entry?.id!==catalog.target)return {ok:false,message:catalog.matchHint};
 if(p[key(library)+'locator']!==catalog.target)return {ok:false,message:'Attach the selected entry’s exact repository locator to the research log.'};
 if(p[key(library)+'access']!==1)return {ok:false,message:catalog.accessHint};
 if(catalog.provenance&&s.provenance!=='verified')return {ok:false,message:catalog.provenance.hint};
 if(catalog.releaseSummary&&!s.releaseLogged)return {ok:false,message:'Carry the full release breakdown and unprocessed-record caveat into the log.'};
 if(!s.retrieval||!s.withdrawals)return {ok:false,message:catalog.followups?'Add both follow-ups: examine individual records and carry forward the remaining evidence gaps.':'Add both follow-ups: confirm retrieval with the archivist and check for withdrawals when the folder arrives.'};
 return {ok:true,message:catalog.accessState?'Research log filed. Individual document examination and coverage gaps remain open.':'Request filed. Folder retrieval, document inspection, and any withdrawals remain to be checked.'};
}
