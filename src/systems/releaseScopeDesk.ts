import '../styles/manuscript-desk.css';
import '../styles/release-scope-desk.css';
import {RELEASE_SCOPE_EVIDENCE,RELEASE_SCOPE_PARTS,type ReleaseScopePart} from '../game/releaseScope';
import {DeskControls} from './deskControls';
import type {InputState} from '../input/InputState';

export class ReleaseScopeDesk {
  private root=document.createElement('dialog');
  private controls:DeskControls;
  private cards:HTMLButtonElement[]=[];
  private status:HTMLElement;
  get active(){return this.controls.active;}
  constructor(toggle:(part:ReleaseScopePart)=>void,file:()=>void,leave:()=>void){
    this.root.className='manuscript-desk release-scope-desk';this.root.setAttribute('aria-labelledby','release-scope-title');
    this.root.innerHTML=`<section class="manuscript-panel">
      <header class="manuscript-heading"><div><p class="manuscript-eyebrow">PROOF CHECK · FICTIONAL FILE C</p><h1 id="release-scope-title">Match the release note.</h1><p>Correct the draft markings against the reviewer’s recorded authorization.</p></div><button class="manuscript-close" data-focus-key="leave">Save &amp; leave</button></header>
      <div class="manuscript-body"><section class="release-authorization" data-reading-start><h2>Reviewer’s recorded scope</h2><strong></strong><p>Parent record: classified. Changing a draft marking does not grant clearance.</p></section><section class="release-parts" aria-label="Draft print markings"></section></div>
      <footer class="manuscript-footer"><p data-status role="status" aria-live="polite"></p><button class="manuscript-submit" data-focus-key="file">File markings →</button><small>Arrows / D-pad to read and move · A / Enter to change a marking · B / Esc to save and leave</small></footer>
    </section>`;
    this.root.querySelector('.release-authorization strong')!.textContent=RELEASE_SCOPE_EVIDENCE;
    this.status=this.root.querySelector('[data-status]')!;
    const host=this.root.querySelector('.release-parts')!;
    for(const [index,part] of RELEASE_SCOPE_PARTS.entries()){
      const button=document.createElement('button');button.type='button';button.className='release-part';button.dataset.focusKey=part.id;button.dataset.part=String(index);button.dataset.readable='';
      const title=document.createElement('strong');title.textContent=part.label;
      const authority=document.createElement('span');authority.className='release-authority';authority.textContent=part.cleared?'Reviewer: cleared':'Reviewer: not cleared';
      const marking=document.createElement('b');marking.className='release-marking';
      const action=document.createElement('small');action.className='release-action';
      button.append(title,authority,marking,action);button.addEventListener('click',()=>toggle(index as ReleaseScopePart));host.append(button);this.cards.push(button);
    }
    const submit=this.root.querySelector<HTMLButtonElement>('[data-focus-key=file]')!,close=this.root.querySelector<HTMLButtonElement>('[data-focus-key=leave]')!;
    submit.addEventListener('click',file);close.addEventListener('click',leave);
    this.controls=new DeskControls(this.root,()=>[...this.cards,submit,close],leave);
  }
  render(mask:number,message:string,error=false){
    this.cards.forEach((button,index)=>{const print=Boolean(mask&(1<<index));button.setAttribute('aria-pressed',String(print));button.dataset.mismatch=String(print!==RELEASE_SCOPE_PARTS[index].cleared);button.querySelector('.release-marking')!.textContent=print?'Draft: PRINT':'Draft: HOLD';button.querySelector('.release-action')!.textContent=print?'Change to hold':'Change to print';});
    this.status.textContent=message;this.status.dataset.error=String(error);
  }
  updateInput(input:InputState){this.controls.updateInput(input);}
  close(){this.controls.close();}
}
