import '../styles/manuscript-desk.css';
import '../styles/compiler-decision-desk.css';
import type { CompilerTask } from '../game/compilerMission';
import type { ChoiceOption } from '../game/types';
import type { InputState } from '../input/InputState';
import { setChoiceState } from '../game/state';
import { DeskControls } from './deskControls';

/** Existing SOP decisions, presented at native resolution without changing their gates. */
export class CompilerDecisionDesk {
 private root=document.createElement('dialog');
 private controls:DeskControls;
 get active(){return this.controls.active;}
 constructor(task:CompilerTask,choose:(option:ChoiceOption)=>void,cancel:()=>void){
  this.root.className='manuscript-desk compiler-decision-desk';this.root.dataset.task=task.id;this.root.setAttribute('aria-labelledby','compiler-decision-title');
  this.root.innerHTML=`<section class="manuscript-panel">
   <header class="manuscript-heading"><div><p class="manuscript-eyebrow"></p><h1 id="compiler-decision-title"></h1></div><button class="manuscript-close" data-focus-key="leave">Return</button></header>
   <div class="manuscript-body"><section class="compiler-decision-content"><p class="compiler-decision-context" data-reading-start></p><div class="compiler-decision-options"></div></section></div>
   <footer class="manuscript-footer"><p>Choose the next action for your manuscript.</p><small>Arrows / D-pad to read and move · A / Enter to choose · B / Esc to return</small></footer>
  </section>`;
  this.root.querySelector('.manuscript-eyebrow')!.textContent=task.phase.toUpperCase();
  this.root.querySelector('h1')!.textContent=task.question;
  this.root.querySelector('.compiler-decision-context')!.textContent=task.context;
  const buttons:HTMLButtonElement[]=[];
  for(const option of task.options){
   const button=document.createElement('button');button.type='button';button.dataset.focusKey=option.value;button.dataset.compilerAnswer=option.value;button.dataset.readable='';button.textContent=option.label;
   button.addEventListener('click',()=>{if(this.active)choose(option);});this.root.querySelector('.compiler-decision-options')!.append(button);buttons.push(button);
  }
  const close=this.root.querySelector<HTMLButtonElement>('[data-focus-key=leave]')!;close.addEventListener('click',cancel);
  this.controls=new DeskControls(this.root,()=>[...buttons,close],cancel);
  setChoiceState(`${task.question}\n\n${task.context}`,[...task.options]);
 }
 updateInput(input:InputState){this.controls.updateInput(input);}
 close(){this.controls.close();}
}
