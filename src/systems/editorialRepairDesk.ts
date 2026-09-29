import '../styles/manuscript-desk.css';
import '../styles/editorial-repair-desk.css';
import type {EditorialRepairRecord} from '../game/editorialRepair';
import {DeskControls} from './deskControls';
import type {InputState} from '../input/InputState';

export class EditorialRepairDesk {
 private root=document.createElement('dialog');
 private controls:DeskControls;
 private initial=true;
 get active(){return this.controls.active;}
 constructor(private record:EditorialRepairRecord,private proof:boolean,repair:()=>void,file:()=>void,leave:()=>void){
  this.root.className='manuscript-desk editorial-repair-desk';this.root.setAttribute('aria-labelledby','editorial-repair-title');
  this.root.innerHTML=`<section class="manuscript-panel">
   <header class="manuscript-heading"><div><p class="manuscript-eyebrow">EDITORIAL REPAIR · FICTIONAL RECORD</p><h1 id="editorial-repair-title">${proof?'Check the indication.':'Make the withholding visible.'}</h1><p data-record-label></p></div><button class="manuscript-close" data-focus-key="leave">Save &amp; leave</button></header>
   <aside class="desk-evidence-strip"><span>Retained evidence</span><strong data-evidence></strong></aside>
   <div class="manuscript-body"><section class="repair-reader-proof" data-readable data-reading-start><h2>Indication readers will see</h2><p data-indication></p><p class="repair-explanation">The indication discloses that text was withheld. It does not declassify or release that text.</p></section><button class="repair-add" data-focus-key="repair">Add withholding indication</button></div>
   <footer class="manuscript-footer"><p data-status role="status" aria-live="polite"></p><button class="manuscript-submit" data-focus-key="file" data-reading-target=".repair-reader-proof">${proof?'File checked proof':'File draft for proofing'} →</button><small>Arrows / D-pad to read and move · A / Enter to act · B / Esc to save and leave</small></footer>
  </section>`;
  this.root.querySelector('[data-record-label]')!.textContent=record.label;
  this.root.querySelector('[data-evidence]')!.textContent=record.evidence;
  const add=this.root.querySelector<HTMLButtonElement>('[data-focus-key=repair]')!,submit=this.root.querySelector<HTMLButtonElement>('[data-focus-key=file]')!,close=this.root.querySelector<HTMLButtonElement>('[data-focus-key=leave]')!;
  add.addEventListener('click',repair);submit.addEventListener('click',file);close.addEventListener('click',leave);
  if(proof)add.hidden=true;
  this.controls=new DeskControls(this.root,()=>proof?[submit,close]:[add,submit,close],leave);
 }
 render(repaired:boolean,message:string,error=false){
  const indication=this.root.querySelector('[data-indication]')!;indication.replaceChildren();
  if(repaired){const text=document.createElement('em');text.textContent=this.record.indication;indication.append(text);}
  else indication.textContent='No withholding indication appears here.';
  this.root.dataset.repaired=String(repaired);
  const add=this.root.querySelector<HTMLButtonElement>('[data-focus-key=repair]')!;
  add.textContent=repaired?'Indication added to draft':'Add withholding indication';
  const status=this.root.querySelector<HTMLElement>('[data-status]')!;status.textContent=message;status.dataset.error=String(error);
  if(this.initial&&repaired)this.controls.refresh('file');this.initial=false;
 }
 updateInput(input:InputState){this.controls.updateInput(input);}
 close(){this.controls.close();}
}
