import '../styles/manuscript-desk.css';
import '../styles/referral-treatment-desk.css';
import {TREATMENT_FIELDS,type TreatmentDraft} from '../game/referralTreatmentDraft';
import {DeskControls} from './deskControls';
import type {InputState} from '../input/InputState';
export class ReferralTreatmentDesk {
 private root=document.createElement('dialog');
 private controls:DeskControls;
 private buttons:HTMLButtonElement[]=[];
 get active(){return this.controls.active;}
 constructor(toggle:(field:keyof TreatmentDraft)=>void,file:()=>void,leave:()=>void){
  this.root.className='manuscript-desk referral-treatment-desk';this.root.setAttribute('aria-labelledby','referral-treatment-title');
  this.root.innerHTML=`<section class="manuscript-panel">
   <header class="manuscript-heading"><div><p class="manuscript-eyebrow">REVIEW TREATMENT · FICTIONAL CASES</p><h1 id="referral-treatment-title">Respect the recorded limits.</h1><p>Check what the case notes permit before filing the treatment.</p></div><button class="manuscript-close" data-focus-key="leave">Save &amp; leave</button></header>
   <aside class="desk-evidence-strip"><span>Case notes</span><strong>Consent pending · Whole document withheld</strong></aside>
   <div class="manuscript-body"><section class="treatment-cases" aria-label="Draft treatment decisions"></section></div>
   <footer class="manuscript-footer"><p data-status role="status" aria-live="polite"></p><button class="manuscript-submit" data-focus-key="file">File treatment →</button><small>Arrows / D-pad to read and move · A / Enter to change treatment · B / Esc to save and leave</small></footer>
  </section>`;
  const host=this.root.querySelector('.treatment-cases')!;
  TREATMENT_FIELDS.forEach(field=>{
   const card=document.createElement('section');card.className='treatment-case';card.dataset.readable='';
   const heading=document.createElement('h2');heading.textContent=field==='permission'?'Foreign note':'Withheld document';
   const evidence=document.createElement('p');evidence.className='treatment-evidence';evidence.textContent=field==='permission'?'Case note: consent pending.':'Case note: the whole document is withheld.';
   const button=document.createElement('button');button.className='treatment-choice';button.type='button';button.dataset.focusKey=field;button.dataset.field=field;
   const value=document.createElement('strong');const action=document.createElement('span');action.textContent='Change treatment →';button.append(value,action);button.addEventListener('click',()=>toggle(field));
   const effect=document.createElement('p');effect.className='treatment-effect';effect.dataset.effect=field;
   card.append(heading,evidence,button,effect);host.append(card);this.buttons.push(button);
  });
  const submit=this.root.querySelector<HTMLButtonElement>('[data-focus-key=file]')!,close=this.root.querySelector<HTMLButtonElement>('[data-focus-key=leave]')!;
  submit.addEventListener('click',file);close.addEventListener('click',leave);this.controls=new DeskControls(this.root,()=>[...this.buttons,submit,close],leave);
 }
 render(draft:TreatmentDraft,message:string,error=false){
  this.buttons.forEach((button,index)=>button.querySelector('strong')!.textContent='Draft: '+draft[TREATMENT_FIELDS[index]]);
  this.root.querySelector('[data-effect=permission]')!.textContent=draft.permission==='HOLD'?'Keep the note out of print while consent remains pending.':'This draft would print the note before consent is recorded.';
  this.root.querySelector('[data-effect=withholding]')!.textContent=draft.withholding==='APPEAL'?'Keep the withheld document in the appeal trail. An appeal does not itself release it.':'This draft would omit the withheld document from the appeal trail.';
  const status=this.root.querySelector<HTMLElement>('[data-status]')!;status.textContent=message;status.dataset.error=String(error);
 }
 updateInput(input:InputState){this.controls.updateInput(input);}
 close(){this.controls.close();}
}
