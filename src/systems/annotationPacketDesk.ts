import '../styles/manuscript-desk.css';
import '../styles/annotation-packet-desk.css';
import type Phaser from 'phaser';
import { DeskControls } from './deskControls';
import { getInput, swallowNextInputFrame } from '../input/InputState';
import { clearChoiceState, setChoiceState } from '../game/state';
import { retroAudio } from './audio';
import { CHOICE_PROMPT_OPEN_EVENT } from './verification';

/** The packet records research work and remaining inquiries, not universal coverage. */
export class AnnotationPacketDesk {
 private root?:HTMLDialogElement;
 private controls?:DeskControls;
 private selected:string|null=null;
 private cancelled?:()=>void;
 constructor(private scene:Phaser.Scene){scene.events.once('shutdown',()=>this.close());}
 get active(){return this.controls?.active??false;}
 show(file:(value:string)=>{ok:boolean;message:string},approved:()=>void,cancelled:()=>void){
  this.close();this.cancelled=cancelled;this.selected=null;this.scene.events.emit(CHOICE_PROMPT_OPEN_EVENT);
  const root=document.createElement('dialog');this.root=root;root.className='manuscript-desk annotation-packet-desk';root.setAttribute('aria-labelledby','annotation-packet-title');
  root.innerHTML=`<section class="manuscript-panel">
   <header class="manuscript-heading"><div><p class="manuscript-eyebrow">RESEARCH TABLE · ANNOTATION PACKET</p><h1 id="annotation-packet-title">Make the research traceable.</h1><p>Read what your three notes contribute before filing the source map.</p></div><button class="manuscript-close" data-focus-key="leave">Return</button></header>
   <aside class="desk-evidence-strip"><span>Evidence limit</span><strong>One verified folder is not the whole record.</strong></aside>
   <div class="manuscript-body"><div class="annotation-packet-content">
    <section data-reading-start class="annotation-note-summary"><h2>Your collected notes</h2>
     <article><h3>Source note</h3><p>Identify where the document came from. Preserve missing classification, distribution, drafting and readership information as unanswered questions.</p></article>
     <article><h3>Context note</h3><p>Explain related events and documents, including useful material not printed in full. Cite the evidence that supports the explanation.</p></article>
     <article><h3>Selection note</h3><p>Explain how the printed documents fit the larger record. Annotation can supply context; it cannot justify concealing an important policy fact.</p></article>
    </section>
    <section class="annotation-map" data-readable><h2>Choose the scope of your source map</h2>
     <p>Research may require Presidential and NSC records, State central files, and office lot files. Treat these as leads to investigate—not records already examined for your assignment.</p>
     <button data-focus-key="single_folder" aria-pressed="false"><strong>Close the map around this folder</strong><span>Leave other repositories and access gaps out.</span></button>
     <button data-focus-key="coverage" aria-pressed="false"><strong>Keep a wider research map</strong><span>Record relevant repositories, unexamined leads, and access gaps separately from verified documents.</span></button>
     <p class="annotation-map-limit">Access to a collection is not permission to publish every document. Record-level examination and clearance still matter.</p>
    </section>
   </div></div>
   <footer class="manuscript-footer"><p data-status role="status" aria-live="polite">Choose a map scope, then file the packet.</p><button class="manuscript-submit" data-focus-key="file">File packet →</button><small>Arrows / D-pad to read and move · A / Enter to choose · B / Esc to return</small></footer>
  </section>`;
  const buttons=Array.from(root.querySelectorAll<HTMLButtonElement>('.annotation-map button'));
  for(const button of buttons){button.dataset.readingTarget='.annotation-packet-content';button.addEventListener('click',()=>{if(!this.active)return;this.selected=button.dataset.focusKey!;for(const b of buttons)b.setAttribute('aria-pressed',String(b===button));this.status('Scope selected — not filed.');retroAudio.annotatePaper();});}
  const submit=root.querySelector<HTMLButtonElement>('[data-focus-key=file]')!,leave=root.querySelector<HTMLButtonElement>('[data-focus-key=leave]')!;
  submit.addEventListener('click',()=>{if(!this.active)return;if(!this.selected){this.status('Choose how the map will account for the wider record.',true);retroAudio.warning();return;}const result=file(this.selected);if(!result.ok){this.status(result.message,true);retroAudio.warning();return;}this.close(false);approved();});
  leave.addEventListener('click',()=>this.close());this.controls=new DeskControls(root,()=>[...buttons,submit,leave],()=>this.close());
  setChoiceState('RESEARCH MAP / ANNOTATION PACKET',[{key:'A',label:'Only this verified folder',value:'single_folder'},{key:'B',label:'Relevant repositories + access gaps',value:'coverage'},{key:'C',label:'Return',value:'back'}]);
 }
 private status(message:string,error=false){const p=this.root?.querySelector<HTMLElement>('[data-status]');if(p){p.textContent=message;p.dataset.error=String(error);}}
 updateInput(){if(this.active)this.controls!.updateInput(getInput());}
 close(cancel=true){if(!this.active)return;this.controls!.close();this.controls=undefined;this.root=undefined;this.selected=null;clearChoiceState();swallowNextInputFrame();if(cancel)this.cancelled?.();}
}
