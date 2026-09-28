import '../styles/manuscript-desk.css';
import '../styles/chapter-assembly.css';
import '../styles/manuscript-revision.css';
import {REVIEW_NOTES,REVISION_SOURCES,ORIGINAL_REVIEW_NOTE,REVISED_REVIEW_NOTE,readReviewNote,chooseRevisionSource,markRevisionPassage,applyManuscriptRevision,evaluateManuscriptRevision,manuscriptRevisionReadout} from '../game/manuscriptRevision';
import {setChoiceState} from '../game/state';
import type {InputState} from '../input/InputState';
import {DeskControls} from './deskControls';
import {retroAudio} from './audio';

export class ManuscriptRevisionDesk {
  private readonly root=document.createElement('dialog');
  private controls?:DeskControls;
  private readonly body:HTMLElement;
  private readonly status:HTMLElement;
  private readonly submit:HTMLButtonElement;
  private readonly leave:HTMLButtonElement;
  get active(){return this.controls?.active??false;}
  constructor(private progress:Record<string,number>,private onSave:()=>void,private onSubmit:()=>void,private onCancel:()=>void){
    this.root.className='manuscript-desk chapter-desk revision-desk';
    this.root.setAttribute('aria-labelledby','revision-title');
    this.root.innerHTML=`<section class="manuscript-panel">
      <header class="manuscript-heading"><div><p class="manuscript-eyebrow">THE COMPILER’S DESK <span>03 / REVISION</span></p><h1 id="revision-title">Let the evidence change the draft.</h1><p>Both reviews are back. Read the comments, find the follow-up, and correct footnote 2.</p></div><button type="button" class="manuscript-close" data-focus-key="leave">Save &amp; leave</button></header>
      <div class="revision-summary" aria-live="polite"></div>
      <div class="manuscript-body assembly-body"></div>
      <footer class="manuscript-footer"><p role="status" data-status>Your original review copy is preserved. Work in the revision copy below.</p><button type="button" class="manuscript-submit" data-focus-key="submit">File revised chapter →</button><small>Illustrative exhibits · Arrows / D-pad to read and move · A / Enter to act · B / Esc to save and leave</small></footer>
    </section>`;
    this.body=this.root.querySelector('.manuscript-body')!;this.status=this.root.querySelector('[data-status]')!;
    this.submit=this.root.querySelector('.manuscript-submit')!;this.leave=this.root.querySelector('.manuscript-close')!;
    this.leave.addEventListener('click',this.onCancel);
    this.submit.addEventListener('click',()=>{
      const result=evaluateManuscriptRevision(this.progress);this.feedback(result);
      if(result.ok){this.onSave();retroAudio.fileDocket();this.onSubmit();}
    });
    this.render();this.controls=new DeskControls(this.root,()=>[...this.body.querySelectorAll<HTMLButtonElement>('button'),this.submit,this.leave],this.onCancel);
  }
  private feedback(result:{ok:boolean,message:string}){this.status.textContent=result.message;this.status.dataset.error=String(!result.ok);if(!result.ok)retroAudio.warning();}
  private changed(key:string,message='Draft saved. The original review copy remains intact.'){
    this.onSave();retroAudio.paperPickup();this.status.textContent=message;this.status.dataset.error='false';this.render(key);
  }
  private button(label:string,key:string,action:()=>void){const b=document.createElement('button');b.type='button';b.textContent=label;b.dataset.focusKey=key;b.addEventListener('click',action);return b;}
  private render(focusKey?:string){
    const state=manuscriptRevisionReadout(this.progress);this.body.replaceChildren();
    this.root.querySelector('.revision-summary')!.textContent=`${state.comments.filter(n=>n.read).length}/2 comments read · ${state.applied?'Correction applied':'Correction pending'} · ${state.backupAttached?'Backup 2 attached':'Backup 2 needed'}`;
    const notes=document.createElement('section');notes.className='revision-comments';notes.innerHTML='<h2>Review copy · margin comments</h2><p class="assembly-brief">DANN-E: “Just accept everything. Who has time to check?”</p>';
    for(const n of REVIEW_NOTES){
      const read=state.comments.find(c=>c.id===n.id)!.read;
      const b=this.button('',`comment-${n.id}`,()=>{readReviewNote(this.progress,n.bit);this.changed(`comment-${n.id}`);});
      b.className='revision-comment';b.dataset.readable='';b.dataset.comment=n.id;b.setAttribute('aria-expanded',String(read));
      const by=document.createElement('strong');by.textContent=n.author;const text=document.createElement('span');text.textContent=read?n.text:'Open margin comment';b.append(by,text);notes.append(b);
    }
    this.body.append(notes);
    const research=document.createElement('section');research.className='revision-research';research.innerHTML='<h2>Reopen the source file</h2><p class="assembly-brief">Footnote 2 says the shortfall was resolved. Find a record that establishes what happened next.</p>';
    const layout=document.createElement('div');layout.className='assembly-evidence';research.append(layout);
    const sources=document.createElement('div');sources.className='assembly-sources';layout.append(sources);
    for(const s of REVISION_SOURCES){const b=this.button(s.title,`source-${s.id}`,()=>{chooseRevisionSource(this.progress,s.id);this.changed(`source-${s.id}`);});b.dataset.source=String(s.id);b.setAttribute('aria-pressed',String(state.source===s.id));sources.append(b);}
    const paper=document.createElement('section');paper.className='assembly-source-paper';layout.append(paper);
    const source=REVISION_SOURCES.find(s=>s.id===state.source);
    if(source){
      const h=document.createElement('h2');h.textContent=source.locator;paper.append(h);
      const hint=document.createElement('p');hint.className='assembly-highlight-help';hint.textContent='Highlight the passage that answers the reviewers’ concern.';paper.append(hint);
      source.lines.forEach((line,i)=>{const b=this.button(line,`line-${source.id}-${i}`,()=>{markRevisionPassage(this.progress,i as 0|1);this.changed(`line-${source.id}-${i}`);});b.dataset.line=String(i);b.dataset.readable='';b.setAttribute('aria-pressed',String(state.highlightedLine===i));paper.append(b);});
    }else paper.innerHTML='<p class="assembly-open-record">Open a record to inspect its contents.</p>';
    this.body.append(research);
    const changes=document.createElement('section');changes.className='revision-changes';changes.dataset.readable='';changes.innerHTML='<h2>Footnote 2 · revision copy</h2>';
    const original=document.createElement('div');original.className='revision-original';original.innerHTML='<span>ORIGINAL REVIEW COPY · RETAINED</span>';const old=document.createElement('p');old.textContent=ORIGINAL_REVIEW_NOTE;original.append(old);changes.append(original);
    const evidence=document.createElement('div');evidence.className='revision-marked-evidence';evidence.dataset.markedEvidence='';
    const evidenceHeading=document.createElement('strong');evidenceHeading.textContent='MARKED SOURCE PASSAGE';
    const citation=document.createElement('span');citation.textContent=state.markedEvidence?`${state.markedEvidence.locator} · passage ${state.markedEvidence.line}`:'No passage marked';
    const quote=document.createElement('p');quote.textContent=state.markedEvidence?`“${state.markedEvidence.text}”`:'Open a record and mark a passage to compare it with the proposed wording.';
    evidence.append(evidenceHeading,citation,quote);changes.append(evidence);
    const proposed=document.createElement('div');proposed.className='revision-proposed';proposed.innerHTML='<span></span>';proposed.querySelector('span')!.textContent=state.applied?'REVISION COPY · CORRECTION APPLIED':'PROPOSED CORRECTION · CHECK BEFORE APPLYING';const edit=document.createElement('p');edit.textContent=REVISED_REVIEW_NOTE;proposed.append(edit);changes.append(proposed);
    const apply=this.button(state.applied?'✓ Correction applied · undo':'Apply supported correction','apply',()=>{
      if(state.applied){delete this.progress.compilerRevisionApplied;this.changed('apply');return;}
      const result=applyManuscriptRevision(this.progress);this.feedback(result);if(result.ok)this.changed('apply','Correction applied to the revision copy; the review copy is unchanged.');
    });apply.className='revision-action';apply.dataset.apply='';apply.setAttribute('aria-pressed',String(state.applied));changes.append(apply);
    const backup=this.button(state.backupAttached?'✓ Backup 2 attached · remove':'Attach backup 2 · Exercise E, page 2, passage 2','backup',()=>{
      this.progress.compilerRevisionBackup=state.backupAttached?0:1;this.changed('backup');
    });backup.className='revision-action';backup.dataset.backup='';backup.setAttribute('aria-pressed',String(state.backupAttached));changes.append(backup);
    const note=document.createElement('p');note.className='assembly-brief';note.textContent='Illustrative records and annotation. This correction addresses the gap and unsupported claim; publication comes later.';changes.append(note);
    this.body.append(changes);
    setChoiceState('MANUSCRIPT REVISION',[{key:'A',label:'Check evidence and revise footnote 2',value:'work'},{key:'B',label:'Save draft and leave',value:'leave'}]);
    this.controls?.refresh(focusKey);
  }
  updateInput(input:InputState){this.controls?.updateInput(input);}
  close(){this.controls?.close();}
}
