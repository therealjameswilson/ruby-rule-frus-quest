import '../styles/manuscript-desk.css';
import '../styles/chronology-desk.css';
import {DeskControls} from './deskControls';
import type {InputState} from '../input/InputState';
import type {ChronologyBoardCase} from './withholdingChronologyBoard';

/** Native text and controls; chronology decisions remain in the board model. */
export class ChronologyDesk {
  private root=document.createElement('dialog');
  private controls:DeskControls;
  private sequence:HTMLElement;
  private status:HTMLElement;
  private later:HTMLButtonElement;
  private firstRender=true;
  get active(){return this.controls.active;}
  constructor(task:ChronologyBoardCase,shift:(direction:-1|1)=>void,file:()=>void,leave:()=>void){
    this.root.className='manuscript-desk chronology-desk';
    this.root.setAttribute('aria-labelledby','chronology-title');
    this.root.innerHTML=`<section class="manuscript-panel">
      <header class="manuscript-heading"><div><p class="manuscript-eyebrow">CHRONOLOGY · FICTIONAL TRAINING CASE</p><h1 id="chronology-title"></h1><p>Compare the event and drafting times. Move the memcon, then file the entry.</p></div><button class="manuscript-close" data-focus-key="leave">Save &amp; leave</button></header>
      <div class="manuscript-body"><section class="chronology-work" data-readable><section class="chronology-evidence" data-reading-start aria-label="Record evidence"></section><h2>Order in the volume</h2><div class="chronology-sequence" aria-label="Draft chronological sequence"></div><div class="chronology-move"><button data-focus-key="earlier">← Move earlier</button><button data-focus-key="later">Move later →</button></div></section></div>
      <footer class="manuscript-footer"><p data-status role="status" aria-live="polite"></p><button class="manuscript-submit" data-focus-key="file">File entry →</button><small>Arrows / D-pad to read and move · A / Enter to act · B / Esc to save and leave</small></footer>
    </section>`;
    this.root.querySelector('h1')!.textContent=task.heading;
    const evidence=this.root.querySelector('.chronology-evidence')!;
    for(const line of task.evidence){const p=document.createElement('p');p.textContent=line;evidence.append(p);}
    this.sequence=this.root.querySelector('.chronology-sequence')!;this.status=this.root.querySelector('[data-status]')!;
    const earlier=this.root.querySelector<HTMLButtonElement>('[data-focus-key=earlier]')!;
    this.later=this.root.querySelector<HTMLButtonElement>('[data-focus-key=later]')!;
    const submit=this.root.querySelector<HTMLButtonElement>('[data-focus-key=file]')!;
    const close=this.root.querySelector<HTMLButtonElement>('[data-focus-key=leave]')!;
    earlier.addEventListener('click',()=>shift(-1));this.later.addEventListener('click',()=>shift(1));submit.addEventListener('click',file);close.addEventListener('click',leave);
    this.controls=new DeskControls(this.root,()=>[earlier,this.later,submit,close],leave);
  }
  render(records:ReturnType<ChronologyBoardCase['sequence']>,message:string,error=false){
    this.sequence.replaceChildren();
    for(let i=0;i<3;i++){
      const record=records[i],card=document.createElement('article');card.className='chronology-record';card.dataset.record=record?.id??'missing';
      const label=document.createElement('strong');label.textContent=record?.label??'ENTRY MISSING';
      const date=document.createElement('span');date.textContent=record?.date??'Keep a place for the record';
      const time=document.createElement('b');time.textContent=record?.time??'—';
      card.append(label,date,time);this.sequence.append(card);
    }
    this.later.textContent=records.length<3?'Insert entry →':'Move later →';
    this.status.textContent=message;this.status.dataset.error=String(error);
    if(this.firstRender){this.firstRender=false;if(records.length<3)this.later.focus({preventScroll:true});}
  }
  updateInput(input:InputState){this.controls.updateInput(input);}
  close(){this.controls.close();}
}
