import '../styles/manuscript-desk.css';
import '../styles/chapter-assembly.css';
import '../styles/library-request.css';
import {requestCatalog,setRequestProvenance,logRequestRelease,requestLocator,libraryRequestReadout,selectRequestEntry,attachRequestLocator,setRequestAccess,toggleRequestFollowup,evaluateLibraryRequest} from '../game/libraryRequest';
import {setChoiceState} from '../game/state';
import type {InputState} from '../input/InputState';
import {DeskControls} from './deskControls';
import {retroAudio} from './audio';
export class LibraryRequestDesk {
 private root=document.createElement('dialog');private controls?:DeskControls;
 private body:HTMLElement;private status:HTMLElement;private submit:HTMLButtonElement;private leave:HTMLButtonElement;
 get active(){return this.controls?.active??false;}
 constructor(private progress:Record<string,number>,private onSave:()=>void,private onSubmit:()=>void,private onCancel:()=>void,private library='reagan'){
  this.root.className='manuscript-desk chapter-desk library-request';this.root.setAttribute('aria-labelledby','request-title');
  this.root.innerHTML=`<section class="manuscript-panel"><header class="manuscript-heading"><div><p class="manuscript-eyebrow">THE READING ROOM <span>01 / FINDING AID</span></p><h1 id="request-title">Build a request the archivist can use.</h1><p>Inspect an entry, attach its locator, and record what you still need.</p></div><button class="manuscript-close" data-focus-key="leave">Save &amp; leave</button></header><div class="manuscript-body assembly-body"></div><footer class="manuscript-footer"><p data-status role="status">DANN-E: “A catalog entry! That means we have read it all. Surely?”</p><button class="manuscript-submit" data-focus-key="submit">File request slip →</button><small>Optional archival example · Arrows / D-pad to move · A / Enter to act · B / Esc to save and leave</small></footer></section>`;
  if(requestCatalog(library)?.accessState){this.root.querySelector('h1')!.textContent='Prepare a traceable research log.';this.root.querySelector('.manuscript-submit')!.textContent='File research log →';}
  this.body=this.root.querySelector('.manuscript-body')!;this.status=this.root.querySelector('[data-status]')!;this.submit=this.root.querySelector('.manuscript-submit')!;this.leave=this.root.querySelector('.manuscript-close')!;
  this.leave.addEventListener('click',onCancel);this.submit.addEventListener('click',()=>{const r=evaluateLibraryRequest(this.progress,this.library);this.status.textContent=r.message;this.status.dataset.error=String(!r.ok);if(r.ok){this.onSave();retroAudio.fileDocket();this.onSubmit();}else retroAudio.warning();});
  this.render();this.controls=new DeskControls(this.root,()=>[...this.body.querySelectorAll<HTMLButtonElement>('button'),this.submit,this.leave],onCancel);
 }
 private button(label:string,key:string,action:()=>void){const b=document.createElement('button');b.type='button';b.textContent=label;b.dataset.focusKey=key;b.dataset.readable='';b.addEventListener('click',action);return b;}
 private changed(key:string){this.onSave();if(key.startsWith('entry-'))retroAudio.turnPaper();else if(key==='attach'||key==='release')retroAudio.paperPickup();else retroAudio.annotatePaper();this.status.textContent='Draft saved. Catalog metadata is preserved; individual documents remain to be examined.';this.status.dataset.error='false';this.render(key);}
 private render(focus?:string){
  const catalog=requestCatalog(this.library)!;const s=libraryRequestReadout(this.progress,this.library);this.body.replaceChildren();
  const catalogPanel=document.createElement('section');catalogPanel.className='request-catalog';const title=document.createElement('h2');title.textContent=catalog.collection;catalogPanel.append(title);
  const source=document.createElement('p');source.className='assembly-brief';source.textContent=`${catalog.library} · ${catalog.sourceNote} Metadata checked September 27, 2026.`;catalogPanel.append(source);
  const brief=document.createElement('p');brief.textContent=catalog.brief;catalogPanel.append(brief);
  const link=this.button(this.library==='clinton'?'Open official catalog ↗':this.library==='bush43'?'Open official inventory ↗':'Open official finding aid ↗','source-link',()=>window.open(catalog.source,'_blank','noopener,noreferrer'));link.className='request-source-link';catalogPanel.append(link);
  const entries=document.createElement('div');entries.className='request-entries';catalogPanel.append(entries);
  for(const e of catalog.entries){const b=this.button('',`entry-${e.id}`,()=>{selectRequestEntry(this.progress,e.id,this.library);this.changed(`entry-${e.id}`);});b.dataset.entry=String(e.id);b.setAttribute('aria-pressed',String(s.entry?.id===e.id));const date=document.createElement('strong');date.textContent=e.date;const text=document.createElement('span');text.textContent=e.title;const identity=document.createElement('small');identity.textContent=e.parts;const access=document.createElement('small');access.textContent=`${e.status}${e.page?` · p. ${e.page}`:""}`;b.append(date,text,identity,access);entries.append(b);}
  this.body.append(catalogPanel);
  const slip=document.createElement('section');slip.className='request-slip';const heading=document.createElement('h2');heading.textContent=catalog.accessState?'Digital research log · draft':'Research request · draft';slip.append(heading);
  const selected=document.createElement('p');selected.textContent=s.entry?`Selected: ${requestLocator(s.entry.id,this.library)}`:'Inspect a repository entry above.';slip.append(selected);
  const attach=this.button('Attach exact locator to slip','attach',()=>{attachRequestLocator(this.progress,this.library);this.changed('attach');});attach.dataset.attach='';attach.disabled=!s.entry;slip.append(attach);
  const citation=document.createElement('blockquote');citation.textContent=s.locator??'No locator attached.';slip.append(citation);
  const prompt=document.createElement('h3');prompt.textContent='What can you put in the access log?';slip.append(prompt);
  for(const [value,label] of [[1,catalog.accessLabel],[2,'All documents retrieved and reviewed online']] as const){const b=this.button(label,`access-${value}`,()=>{setRequestAccess(this.progress,value,this.library);this.changed(`access-${value}`);});b.dataset.access=String(value);b.setAttribute('aria-pressed',String(s.access===(value===1?(catalog.accessState??'retrieval-pending'):'reviewed-online')));slip.append(b);}
  if(catalog.provenance){
   const h=document.createElement('h3');h.textContent='Preserve how these records were released';slip.append(h);
   for(const [value,label] of [[1,catalog.provenance.correct],[2,catalog.provenance.wrong]] as const){const b=this.button(label,`provenance-${value}`,()=>{setRequestProvenance(this.progress,value,this.library);this.changed(`provenance-${value}`);});b.dataset.provenance=String(value);b.setAttribute('aria-pressed',String(s.provenance===(value===1?'verified':'mislabeled')));slip.append(b);}
  }
  if(catalog.releaseSummary){
   const h=document.createElement('h3');h.textContent='Inventory coverage · retain the limits';slip.append(h);
   const summary=document.createElement('blockquote');summary.textContent=catalog.releaseSummary;slip.append(summary);
   const b=this.button(s.releaseLogged?'✓ Release breakdown attached':'Attach release breakdown and processing caveat','release',()=>{logRequestRelease(this.progress,this.library);this.changed('release');});b.dataset.release='';b.setAttribute('aria-pressed',String(s.releaseLogged));slip.append(b);
  }
  const todo=document.createElement('h3');todo.textContent='Carry forward the unfinished work';slip.append(todo);
  for(const [task,label] of [['retrieval',catalog.followups?.[0]??'Confirm folder retrieval with the archivist'],['withdrawals',catalog.followups?.[1]??'Check for withdrawals when inspecting the folder']] as const){const b=this.button(`${s[task]?'✓ ':''}${label}`,task,()=>{toggleRequestFollowup(this.progress,task,this.library);this.changed(task);});b.dataset.followup=task;b.setAttribute('aria-pressed',String(s[task]));slip.append(b);}
  this.body.append(slip);setChoiceState('LIBRARY REQUEST SLIP',[{key:'A',label:'Inspect catalog and prepare request',value:'work'},{key:'B',label:'Save request and leave',value:'leave'}]);this.controls?.refresh(focus);
 }
 updateInput(input:InputState){this.controls?.updateInput(input);}
 close(){this.controls?.close();}
}
