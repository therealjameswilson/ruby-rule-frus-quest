import '../styles/manuscript-desk.css';
import '../styles/binding-certification-desk.css';
import type {BindingCertificationEvidence} from '../game/bindingCertification';
import {DeskControls} from './deskControls';
import type {InputState} from '../input/InputState';

export class BindingCertificationDesk {
 private root=document.createElement('dialog');
 private controls:DeskControls;
 get active(){return this.controls.active;}
 constructor(seal:()=>void,leave:()=>void){
  this.root.className='manuscript-desk binding-certification-desk';this.root.setAttribute('aria-labelledby','binding-certification-title');
  this.root.innerHTML=`<section class="manuscript-panel">
   <header class="manuscript-heading"><div><p class="manuscript-eyebrow">BINDERY · HUMAN STANDARDS SEAL</p><h1 id="binding-certification-title">Account for the full record.</h1><p>Review the volume’s evidence before sealing the record.</p></div><button class="manuscript-close" data-focus-key="leave">Return to desk</button></header>
   <aside class="desk-evidence-strip"><span>Editorial commitment</span><strong>Keep major facts. Do not conceal policy defects.</strong></aside>
   <div class="manuscript-body"><section class="binding-ledger" data-readable data-reading-start aria-label="Publication evidence"></section></div>
   <footer class="manuscript-footer"><p data-status role="status" aria-live="polite"></p><button class="manuscript-submit" data-focus-key="seal" data-reading-target=".binding-ledger">Seal the full record →</button><small>Up / Down to read the evidence · A / Enter to seal · B / Esc to return</small></footer>
  </section>`;
  this.root.querySelector('[data-focus-key=seal]')!.addEventListener('click',seal);this.root.querySelector('[data-focus-key=leave]')!.addEventListener('click',leave);
  this.controls=new DeskControls(this.root,()=>[this.root.querySelector<HTMLButtonElement>('[data-focus-key=seal]')!,this.root.querySelector<HTMLButtonElement>('[data-focus-key=leave]')!],leave);
 }
 render(e:BindingCertificationEvidence,message:string,error=false){
  const rows=[
   ['Proofs filed',`${e.proofed} / ${e.documents}`,e.documents>0&&e.proofed===e.documents,'Selected documents need completed proofs, citations and annotations.'],
   ['Review responses resolved',`${e.resolved} / ${e.equities}`,e.equities>0&&e.resolved===e.equities,'Outstanding review responses must be resolved before publication.'],
   ['Undisclosed cuts',String(e.hiddenCuts),e.hiddenCuts===0,'The record must not silently hide deleted material.'],
   ['Unresolved standards issues',String(e.unresolved),e.unresolved===0,'Resolve recorded issues before making the final attestation.']
  ] as const;
  const host=this.root.querySelector('.binding-ledger')!;host.replaceChildren();
  for(const [title,value,complete,detail] of rows){
   const row=document.createElement('section');row.className='binding-check';row.dataset.complete=String(complete);
   const heading=document.createElement('h2');heading.textContent=title;
   const count=document.createElement('strong');count.textContent=value;
   const status=document.createElement('span');status.textContent=complete?'Complete':'Needs attention';
   const p=document.createElement('p');p.textContent=detail;row.append(heading,count,status,p);host.append(row);
  }
  const status=this.root.querySelector<HTMLElement>('[data-status]')!;status.textContent=message;status.dataset.error=String(error);
 }
 updateInput(input:InputState){this.controls.updateInput(input);}
 close(){this.controls.close();}
}
