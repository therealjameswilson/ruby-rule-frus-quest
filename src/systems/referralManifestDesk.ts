import '../styles/manuscript-desk.css';
import '../styles/referral-manifest-desk.css';
import {REFERRAL_EQUITY_PACKETS} from '../game/referralVaultReview';
import {DISPATCH_STACKS} from '../game/referralDispatch';
import type {ReferralManifest} from '../game/referralManifest';
import {DeskControls} from './deskControls';
import type {InputState} from '../input/InputState';
export class ReferralManifestDesk {
 private root=document.createElement('dialog');
 private controls:DeskControls;
 private routes:HTMLButtonElement[]=[];
 get active(){return this.controls.active;}
 constructor(evidenceAvailable:boolean,change:(index:number)=>void,file:()=>void,leave:()=>void){
  this.root.className='manuscript-desk referral-manifest-desk';this.root.setAttribute('aria-labelledby','referral-manifest-title');
  this.root.innerHTML=`<section class="manuscript-panel">
   <header class="manuscript-heading"><div><p class="manuscript-eyebrow">REFERRAL MANIFEST · FICTIONAL BATCH</p><h1 id="referral-manifest-title">Check the agency routes.</h1><p>Compare StateChat’s draft with the source copy before filing.</p></div><button class="manuscript-close" data-focus-key="leave">Save &amp; leave</button></header>
   <aside class="desk-evidence-strip"><span>Dispatch evidence</span><strong data-evidence></strong></aside>
   <div class="manuscript-body"><p class="manifest-limit" data-reading-start>Routing sends a record for review. It does not grant release approval.</p><section class="manifest-routes" aria-label="Draft agency routes"></section></div>
   <footer class="manuscript-footer"><p data-status role="status" aria-live="polite"></p><button class="manuscript-submit" data-focus-key="file">File routing manifest →</button><small>Arrows / D-pad to read and move · A / Enter to change agency · B / Esc to save and leave</small></footer>
  </section>`;
  this.root.querySelector('[data-evidence]')!.textContent=evidenceAvailable?DISPATCH_STACKS.evidence:'Find the dispatch copy in the north stacks.';
  const host=this.root.querySelector('.manifest-routes')!;
  REFERRAL_EQUITY_PACKETS.forEach((packet,index)=>{
   const button=document.createElement('button');button.type='button';button.className='manifest-route';button.dataset.focusKey=packet.id;button.dataset.route=String(index);button.dataset.readable='';
   const label=document.createElement('strong');label.textContent=packet.label;
   const agency=document.createElement('span');agency.className='manifest-agency';
   const action=document.createElement('small');action.textContent='Change agency →';
   button.append(label,agency,action);button.addEventListener('click',()=>change(index));host.append(button);this.routes.push(button);
  });
  const submit=this.root.querySelector<HTMLButtonElement>('[data-focus-key=file]')!,close=this.root.querySelector<HTMLButtonElement>('[data-focus-key=leave]')!;
  submit.addEventListener('click',file);close.addEventListener('click',leave);
  this.controls=new DeskControls(this.root,()=>[...this.routes,submit,close],leave);
 }
 render(manifest:ReferralManifest,message:string,error=false){
  this.routes.forEach((button,index)=>button.querySelector('.manifest-agency')!.textContent='Draft route: '+manifest[REFERRAL_EQUITY_PACKETS[index].id]);
  const status=this.root.querySelector<HTMLElement>('[data-status]')!;status.textContent=message;status.dataset.error=String(error);
 }
 updateInput(input:InputState){this.controls.updateInput(input);}
 close(){this.controls.close();}
}
