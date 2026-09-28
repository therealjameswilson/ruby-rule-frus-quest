import '../styles/manuscript-desk.css';
import '../styles/chapter-assembly.css';
import {CHAPTER_EXHIBITS,CHAPTER_ANNOTATION,CHAPTER_COMPONENTS,chapterAssemblyReadout,advanceChapterAssembly,moveChapterExhibit,selectChapterSource,highlightChapterLine,toggleChapterComponent} from '../game/chapterAssembly';
import {setChoiceState} from '../game/state';
import type {InputState} from '../input/InputState';
import {DeskControls} from './deskControls';
import {retroAudio} from './audio';
import {prefersReducedMotion} from './motionPreferences';

export class ChapterAssemblyDesk {
  private readonly root=document.createElement('dialog');
  private controls?:DeskControls;
  private readonly body:HTMLElement;
  private readonly status:HTMLElement;
  private readonly submit:HTMLButtonElement;
  private readonly back:HTMLButtonElement;
  private readonly leave:HTMLButtonElement;
  get active(){return this.controls?.active??false;}
  constructor(private progress:Record<string,number>,private onSave:()=>void,private onSubmit:()=>void,private onCancel:()=>void){
    this.root.className='manuscript-desk chapter-desk';
    this.root.setAttribute('aria-modal','true');this.root.setAttribute('aria-labelledby','chapter-title');
    this.root.innerHTML=`<section class="manuscript-panel">
      <header class="manuscript-heading"><div><p class="manuscript-eyebrow">THE COMPILER’S DESK <span>02 / CHAPTER ASSEMBLY</span></p><h1 id="chapter-title"></h1><p data-instruction></p></div><button class="manuscript-close" data-focus-key="leave" type="button">Save &amp; leave</button></header>
      <ol class="assembly-progress" aria-label="Chapter assembly stages"><li>1 <span>Arrange records</span></li><li>2 <span>Trace the quote</span></li><li>3 <span>Assemble packet</span></li></ol>
      <div class="manuscript-body assembly-body"></div>
      <footer class="manuscript-footer"><p data-status role="status" aria-live="polite">DANN-E has shuffled the records. Read the dates before moving them.</p><div class="assembly-actions"><button class="assembly-back" data-focus-key="back" type="button">Back</button><button class="manuscript-submit" data-focus-key="submit" type="button"></button></div><small>Illustrative exhibits · Arrows / D-pad to read and move · A / Enter to act · B / Esc to save and leave</small></footer>
    </section>`;
    this.body=this.root.querySelector('.assembly-body')!;this.status=this.root.querySelector('[data-status]')!;
    this.submit=this.root.querySelector('.manuscript-submit')!;this.back=this.root.querySelector('.assembly-back')!;this.leave=this.root.querySelector('.manuscript-close')!;
    this.submit.addEventListener('click',()=>{
      const before=chapterAssemblyReadout(this.progress).step,result=advanceChapterAssembly(this.progress);
      this.status.textContent=result.message;this.status.dataset.error=String(!result.ok);
      if(!result.ok){retroAudio.warning();return;}
      this.onSave();retroAudio.fileDocket();if(before===2){this.onSubmit();return;}
      this.render('');
    });
    this.back.addEventListener('click',()=>{this.progress.compilerAssemblyStep=Math.max(0,chapterAssemblyReadout(this.progress).step-1);this.onSave();this.render('');this.status.textContent='Draft kept. You can check or revise the earlier step.';this.status.dataset.error='false';});
    this.leave.addEventListener('click',()=>this.onCancel());
    this.render();
    this.status.textContent=['DANN-E has shuffled the records. Read the dates before moving them.','Your source selection and marks are saved. Check the passage before assembling the chapter.','Keep the documents, chapter annotations, and numbered backup together for first review.'][chapterAssemblyReadout(this.progress).step];
    this.controls=new DeskControls(this.root,()=>[...this.body.querySelectorAll<HTMLButtonElement>('button'),this.back,this.submit,this.leave],this.onCancel);
  }
  private changed(focusKey:string){this.onSave();retroAudio.paperPickup();this.status.textContent='Draft saved. Follow the evidence before sending the chapter.';this.status.dataset.error='false';this.render(focusKey);}
  private button(label:string,key:string,action:()=>void){const b=document.createElement('button');b.type='button';b.textContent=label;b.dataset.focusKey=key;b.addEventListener('click',action);return b;}
  private render(focusKey?:string){
    const state=chapterAssemblyReadout(this.progress);
    this.root.dataset.step=String(state.step);
    const titles=['Put the events in order.','Make the footnote checkable.','Keep the chapter together.'];
    const instructions=['Arrange the discussion, instruction, and implementation report. Keep write-up dates distinct from the events.','Open an exhibit and highlight the sentence that supports footnote 1.','Attach the documents, chapter annotations, and numbered backup for your supervisor.'];
    this.root.querySelector('#chapter-title')!.textContent=titles[state.step];this.root.querySelector('[data-instruction]')!.textContent=instructions[state.step];
    this.root.querySelectorAll('.assembly-progress li').forEach((li,i)=>{li.setAttribute('aria-current',i===state.step?'step':'false');(li as HTMLElement).dataset.done=String(i<state.step);});
    this.submit.textContent=['Set chronology →','Verify footnote →','Send to first review →'][state.step];this.back.disabled=state.step===0;
    this.body.replaceChildren();
    if(state.step===0)this.renderChronology();else if(state.step===1)this.renderEvidence();else this.renderPacket();
    setChoiceState(`CHAPTER ASSEMBLY · ${state.step+1}/3 · ${titles[state.step]}`,[{key:'A',label:instructions[state.step],value:'work'},{key:'B',label:'Save draft and leave',value:'leave'}]);
    this.controls?.refresh(focusKey);
  }
  private renderChronology(){
    const state=chapterAssemblyReadout(this.progress);
    const introduction=document.createElement('p');introduction.className='assembly-brief';introduction.textContent='Your selected decision trail · Fictional records A–C. DANN-E: “I sorted them by typing date. You’re welcome.”';this.body.append(introduction);
    const list=document.createElement('ol');list.className='assembly-records';list.setAttribute('aria-label','Document sequence');this.body.append(list);
    state.order.forEach((id,index)=>{
      const exhibit=CHAPTER_EXHIBITS.find(e=>e.id===id)!;const row=document.createElement('li');row.dataset.record=id;row.dataset.readable='';
      row.innerHTML=`<span class="assembly-position"></span><div class="assembly-record-text"><span class="assembly-exhibit"></span><h2></h2><p class="assembly-event"></p><p class="assembly-prepared"></p></div><div class="assembly-move"></div>`;
      row.querySelector('.assembly-position')!.textContent=String(index+1);row.querySelector('.assembly-exhibit')!.textContent=exhibit.locator;
      row.querySelector('h2')!.textContent=exhibit.title;row.querySelector('.assembly-event')!.textContent=`${exhibit.dateLabel}: ${exhibit.event}`;row.querySelector('.assembly-prepared')!.textContent=exhibit.prepared;
      for(const direction of [-1,1] as const){
        const key=`move-${id}-${direction}`;const b=this.button(direction===-1?'↑ Earlier':'↓ Later',key,()=>{
          const positions=new Map(Array.from(this.body.querySelectorAll<HTMLElement>('[data-record]')).map(e=>[e.dataset.record,e.getBoundingClientRect().top]));
          if(!moveChapterExhibit(this.progress,id,direction))return;this.changed(key);
          if(!prefersReducedMotion())for(const node of this.body.querySelectorAll<HTMLElement>('[data-record]')){const dy=(positions.get(node.dataset.record)??node.getBoundingClientRect().top)-node.getBoundingClientRect().top;if(Math.abs(dy)>1)node.animate([{transform:`translateY(${dy}px)`},{transform:'translateY(0)'}],{duration:180,easing:'ease-out'});}
        });
        b.setAttribute('aria-label',`Move ${exhibit.title} ${direction===-1?'earlier':'later'}`);b.disabled=direction===-1?index===0:index===2;row.querySelector('.assembly-move')!.append(b);
      }
      list.append(row);
    });
  }
  private renderEvidence(){
    const state=chapterAssemblyReadout(this.progress);
    const note=document.createElement('section');note.className='assembly-annotation';note.innerHTML='<span>CHAPTER ANNOTATIONS · FOOTNOTE 1</span><p></p><small>Illustrative sentence and exercise excerpts; not archival quotations.</small>';note.querySelector('p')!.textContent=CHAPTER_ANNOTATION;this.body.append(note);
    const layout=document.createElement('div');layout.className='assembly-evidence';this.body.append(layout);
    const sources=document.createElement('div');sources.className='assembly-sources';sources.setAttribute('aria-label','Source exhibits');layout.append(sources);
    for(const e of CHAPTER_EXHIBITS){const b=this.button(`${e.id} · ${e.title}`,`source-${e.id}`,()=>{selectChapterSource(this.progress,e.id);this.changed(`source-${e.id}`);});b.dataset.source=e.id;b.setAttribute('aria-pressed',String(state.source===e.id));sources.append(b);}
    const record=document.createElement('section');record.className='assembly-source-paper';layout.append(record);
    const e=CHAPTER_EXHIBITS.find(e=>e.id===state.source);
    if(!e){record.innerHTML='<p class="assembly-open-record">Open a source exhibit to read its text.</p>';return;}
    const header=document.createElement('h2');header.textContent=e.locator;record.append(header);
    const instruction=document.createElement('p');instruction.className='assembly-highlight-help';instruction.textContent='Select the sentence to highlight for backup 1.';record.append(instruction);
    e.lines.forEach((line,index)=>{const b=this.button(line,`line-${e.id}-${index}`,()=>{highlightChapterLine(this.progress,index as 0|1);this.changed(`line-${e.id}-${index}`);});b.dataset.line=String(index);b.dataset.readable='';b.setAttribute('aria-pressed',String(state.highlightedLine===index));record.append(b);});
    if(state.highlightedLine!==null){const cite=document.createElement('p');cite.className='assembly-citation';cite.textContent=`Backup 1 · ${e.locator} · passage ${state.highlightedLine+1} marked`;record.append(cite);}
  }
  private renderPacket(){
    const state=chapterAssemblyReadout(this.progress);
    const summary=document.createElement('p');summary.className='assembly-brief';summary.textContent='Chronology set · Footnote 1 traced to Exercise C, page 2. Attach each part to the review packet.';this.body.append(summary);
    const files=document.createElement('div');files.className='assembly-files';this.body.append(files);
    CHAPTER_COMPONENTS.forEach((component,index)=>{
      const b=this.button('',`attach-${component.id}`,()=>{toggleChapterComponent(this.progress,component.bit);this.changed(`attach-${component.id}`);});b.className='assembly-file';b.dataset.component=component.id;b.dataset.readable='';b.setAttribute('aria-pressed',String(state.components[index].attached));
      b.innerHTML='<span class="assembly-file-number"></span><strong></strong><span class="assembly-file-detail"></span><span class="assembly-file-action"></span>';
      b.querySelector('.assembly-file-number')!.textContent=String(index+1).padStart(2,'0');b.querySelector('strong')!.textContent=component.title;b.querySelector('.assembly-file-detail')!.textContent=component.detail;b.querySelector('.assembly-file-action')!.textContent=state.components[index].attached?'✓ Attached · tap to remove':'+ Attach to chapter';files.append(b);
    });
    const receipt=document.createElement('div');receipt.className='assembly-bundle';receipt.dataset.ready=String(state.components.every(c=>c.attached));receipt.textContent=`${state.components.filter(c=>c.attached).length}/3 parts attached · First review is next. Publication is later.`;this.body.append(receipt);
  }
  updateInput(input:InputState){this.controls?.updateInput(input);}
  close(){this.controls?.close();}
}
