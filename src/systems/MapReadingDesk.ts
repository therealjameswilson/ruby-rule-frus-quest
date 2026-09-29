import '../styles/manuscript-desk.css';
import '../styles/compiler-feedback-desk.css';
import type { InputState } from '../input/InputState';
import { DeskControls } from './deskControls';

/** Presents existing map dialogue without changing its rewards or progression. */
export class MapReadingDesk {
 private root=document.createElement('dialog');
 private controls:DeskControls;
 constructor(speaker:string,text:string,index:number,total:number,next:()=>void,previous:()=>void,cancel:()=>void){
  this.root.className='manuscript-desk compiler-feedback-desk map-reading-desk';
  this.root.setAttribute('aria-labelledby','map-reading-title');
  this.root.innerHTML=`<section class="manuscript-panel">
   <header class="manuscript-heading"><div><p class="manuscript-eyebrow"></p><h1 id="map-reading-title"></h1></div><button class="manuscript-close" data-focus-key="leave">Return</button></header>
   <div class="manuscript-body"><section class="compiler-feedback-reading" data-readable><p data-explanation></p></section></div>
   <footer class="manuscript-footer"><button class="manuscript-close" data-focus-key="previous">Back</button><button class="manuscript-submit" data-focus-key="continue" data-reading-target=".compiler-feedback-reading"></button><small>Up / Down to read · A / Enter to continue · B / Esc to return</small></footer>
  </section>`;
  this.root.querySelector('.manuscript-eyebrow')!.textContent=`FIELD NOTES · ${index+1} OF ${total}`;
  this.root.querySelector('h1')!.textContent=speaker;
  this.root.querySelector('[data-explanation]')!.textContent=text;
  const nextButton=this.root.querySelector<HTMLButtonElement>('[data-focus-key=continue]')!;
  const back=this.root.querySelector<HTMLButtonElement>('[data-focus-key=previous]')!;
  const leave=this.root.querySelector<HTMLButtonElement>('[data-focus-key=leave]')!;
  // Shared close styling is absolute on small screens; Back belongs in the footer.
  back.style.position='static';back.disabled=index===0;back.hidden=index===0;
  nextButton.textContent=index+1===total?'Return to room →':'Continue →';
  nextButton.addEventListener('click',next);back.addEventListener('click',previous);leave.addEventListener('click',cancel);
  this.controls=new DeskControls(this.root,()=>[nextButton,back,leave],cancel);
 }
 updateInput(input:InputState){this.controls.updateInput(input);}
 close(){this.controls.close();}
}
