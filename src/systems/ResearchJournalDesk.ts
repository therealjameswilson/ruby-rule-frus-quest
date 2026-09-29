import { isNaraVisit, naraScoutUrl, NARA_SCOUT_STEPS } from '../game/naraScout';
import '../styles/manuscript-desk.css';
import '../styles/research-journal.css';
import { RESEARCH_LANDMARKS, researchHolding, collectionPages, type ResearchLandmark } from '../game/researchWorld';
import {libraryAssignment,libraryStage} from '../game/libraryResearch';
import {nscDungeon,nscStage} from '../game/nscResearch';
import {setChoiceState} from '../game/state';
import {DeskControls} from './deskControls';
import type {InputState} from '../input/InputState';

/** Browses recorded leads without changing discoveries or research progress. */
export class ResearchJournalDesk {
 private root=document.createElement('dialog');
 private controls:DeskControls;
 private content:HTMLElement;
 private back:HTMLButtonElement;
 private leave:HTMLButtonElement;
 private found:ResearchLandmark[];
 private items:HTMLButtonElement[]=[];
 constructor(private progress:Readonly<Record<string,number>>,close:()=>void, initialLandmark?:string){
  this.found=RESEARCH_LANDMARKS.filter(l=>progress[`researchVisited_${l.id}`]===1);
  this.root.className='manuscript-desk research-journal';this.root.setAttribute('aria-labelledby','journal-title');
  this.root.innerHTML=`<section class="manuscript-panel">
   <header class="manuscript-heading"><div><p class="manuscript-eyebrow">FIELD JOURNAL</p><h1 id="journal-title">Discovered places</h1><p data-count></p></div></header>
   <div class="manuscript-body"><section class="journal-reading" data-readable></section></div>
   <footer class="manuscript-footer"><button class="manuscript-close" data-focus-key="places" data-reading-target=".journal-reading">Back to places</button><button class="manuscript-submit" data-focus-key="leave" data-reading-target=".journal-reading">Return outdoors</button><small>Up / Down: browse or read · A / Enter: open · B / Esc: return outdoors</small></footer>
  </section>`;
  this.content=this.root.querySelector('.journal-reading')!;
  this.back=this.root.querySelector('[data-focus-key=places]')!;this.leave=this.root.querySelector('[data-focus-key=leave]')!;
  this.back.addEventListener('click',()=>this.render());this.leave.addEventListener('click',close);
  this.root.querySelector('[data-count]')!.textContent=`${this.found.length} / ${RESEARCH_LANDMARKS.length} landmarks discovered`;
  this.render(this.found.find(l=>l.id===initialLandmark));this.controls=new DeskControls(this.root,()=>[...this.items,this.back,...this.content.querySelectorAll<HTMLAnchorElement>('a'),this.leave],close);
 }
 private text(tag:string,text:string){const e=document.createElement(tag);e.textContent=text;this.content.append(e);return e;}
 private render(landmark?:ResearchLandmark){
  this.content.replaceChildren();this.items=[];this.back.hidden=!landmark;this.back.disabled=!landmark;
  this.root.querySelector('.manuscript-body')!.scrollTop=0;
  this.root.querySelector('h1')!.textContent=landmark?.name??'Discovered places';
  if(landmark){
   this.text('p',landmark.location).className='journal-location';
   if(isNaraVisit(landmark.id)){
    this.text('h2','NARA Scout research desk');
    this.text('p','Scout NARA catalog leads while visiting Archives I or Archives II. Results can belong to other NARA repositories; check the holding location.');
    const a=this.text('a','Open NARA Scout · 1989–2001') as HTMLAnchorElement;
    a.href=naraScoutUrl();a.target='_blank';a.rel='noopener noreferrer';a.dataset.focusKey='nara-scout';
    this.text('p','Opens in a new tab; your game stays here. Scout currently supports Bush 41 and Clinton collections through 2001. Your game research window remains 1989–2008. Use library guides for later records.');
    this.text('p','The link presets dates and scope; you choose the query. Recheck dates after selecting a Scout topic pack. Include only individual records dated 1989–2008.');
    for(const step of NARA_SCOUT_STEPS)this.text('p',step);
    this.text('p','Returning from Scout does not automatically file a source, complete research, or grant publication clearance.');
   }
   if(libraryAssignment(landmark.id))this.text('p',`Library research packet: ${libraryStage(this.progress,landmark.id)} / 4`);
   if(nscDungeon(landmark.id))this.text('p',`NSC wing: ${nscStage(this.progress,landmark.id)} / 3 checks filed`);
   const holding=researchHolding(landmark.id);
   this.text('h2','Holdings and leads');this.text('p',holding.text);
   for(const paragraph of collectionPages(landmark.id))this.text('p',paragraph);
   this.text('h2','Research note');this.text('p',landmark.lesson);
   this.text('p','A visit records a research lead, not a cleared document. Consult catalogs and repository staff for holdings and access.');
   this.text('h2','Repository references');
   for(const url of new Set([landmark.source,holding.source])){const a=this.text('a',url) as HTMLAnchorElement;a.href=url;a.target='_blank';a.rel='noopener noreferrer';a.dataset.focusKey=`source-${this.content.querySelectorAll('a').length}`;}
  }else{
   const intro=this.text('p','Choose a discovered place to revisit its holdings and research notes. Explore in any order.');intro.dataset.readingStart='';
   if(!this.found.length)this.text('p','Walk to an archive or library and press A to record your first lead.');
   for(const l of this.found){const button=document.createElement('button');button.className='journal-place';button.dataset.focusKey=l.id;button.dataset.readable='';button.textContent=`${l.name} — ${l.location}`;button.addEventListener('click',()=>this.render(l));this.content.append(button);this.items.push(button);}
   this.text('h2','Finding your way');this.text('p','DC: Potomac Green west, Capital Commons east, Maryland Grove north. Rail links four distant library regions.');
   this.text('p','Research lessons are practice prompts. The map compresses real distances.');
  }
  // Detail starts with its reading control, before links farther down the page.
  this.controls?.refresh(landmark?'places':this.found[0]?.id??'leave');
  setChoiceState(landmark?`FIELD JOURNAL · ${landmark.name}`:'FIELD JOURNAL',[{key:'A',label:landmark?'Back to places':'Browse discovered places',value:'journal'},{key:'B',label:'Return outdoors',value:'leave'}]);
 }
 updateInput(input:InputState){this.controls.updateInput(input);}
 close(){this.controls.close();}
}
