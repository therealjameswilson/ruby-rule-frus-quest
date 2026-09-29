import '../styles/manuscript-desk.css';
import '../styles/compiler-feedback-desk.css';
import type { InputState } from '../input/InputState';
import { setChoiceState } from '../game/state';
import { DeskControls } from './deskControls';

/** The explanation is a receipt for the decision, not another approval gate. */
export class CompilerFeedbackDesk {
 private root=document.createElement('dialog');
 private controls:DeskControls;
 get active(){return this.controls.active;}
 constructor(phase:string,message:string,accepted:boolean,next:()=>void,cancel:()=>void){
  this.root.className='manuscript-desk compiler-feedback-desk';this.root.dataset.accepted=String(accepted);this.root.setAttribute('aria-labelledby','compiler-feedback-title');
  this.root.innerHTML=`<section class="manuscript-panel">
   <header class="manuscript-heading"><div><p class="manuscript-eyebrow"></p><h1 id="compiler-feedback-title"></h1></div><button class="manuscript-close" data-focus-key="leave">Return</button></header>
   <div class="manuscript-body"><section class="compiler-feedback-reading" data-readable><p data-explanation></p></section></div>
   <footer class="manuscript-footer"><p data-receipt></p><button class="manuscript-submit" data-focus-key="continue" data-reading-target=".compiler-feedback-reading"></button><small>Up / Down to read · A / Enter to continue · B / Esc to return</small></footer>
  </section>`;
  this.root.querySelector('.manuscript-eyebrow')!.textContent=phase;
  this.root.querySelector('h1')!.textContent=accepted?'Decision recorded.':'Recheck the packet.';
  this.root.querySelector('[data-explanation]')!.textContent=message;
  this.root.querySelector('[data-receipt]')!.textContent=accepted?'This decision is saved.':'No progress granted for this answer.';
  const proceed=this.root.querySelector<HTMLButtonElement>('[data-focus-key=continue]')!,leave=this.root.querySelector<HTMLButtonElement>('[data-focus-key=leave]')!;
  proceed.textContent=accepted?'Continue →':'Try again →';proceed.addEventListener('click',()=>{if(this.active)next();});leave.addEventListener('click',cancel);
  this.controls=new DeskControls(this.root,()=>[proceed,leave],cancel);
  setChoiceState(`${accepted?'DECISION RECORDED':'RECHECK THE PACKET'} · ${phase}`,[{key:'A',label:proceed.textContent,value:'continue'},{key:'B',label:'Return',value:'back'}]);
 }
 updateInput(input:InputState){this.controls.updateInput(input);}
 close(){this.controls.close();}
}
