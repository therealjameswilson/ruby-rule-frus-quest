import '../styles/manuscript-desk.css';
import '../styles/production-overview.css';
import type { FrusProductionBoardReadout } from '../game/frusProductionBoard';
import type { getCompilerMissionReadout } from '../game/compilerMission';
import { setChoiceState } from '../game/state';
import type { InputState } from '../input/InputState';
import { DeskControls } from './deskControls';

const SECTIONS = ['Next task', 'Progress', 'Research'] as const;
/** Read-only navigation; opening this overview never files or awards anything. */
export class ProductionOverviewDesk {
 private root=document.createElement('dialog');
 private controls:DeskControls;
 private body:HTMLElement;
 private tabs:HTMLButtonElement[]=[];
 constructor(private board:FrusProductionBoardReadout,private compiler:ReturnType<typeof getCompilerMissionReadout>,private guidance:{objective:string;published:boolean},leave:()=>void){
  this.root.className='manuscript-desk production-overview';
  this.root.setAttribute('aria-labelledby','production-overview-title');
  this.root.innerHTML=`<section class="manuscript-panel">
   <header class="manuscript-heading"><div><p class="manuscript-eyebrow">FRUS · PRODUCTION BOARD</p><h1 id="production-overview-title">Your volume</h1></div></header>
   <nav class="production-tabs" aria-label="Board sections"></nav>
   <div class="manuscript-body"><section class="production-reading" data-readable></section></div>
   <footer class="manuscript-footer"><p data-total></p><button class="manuscript-submit" data-focus-key="leave">Return to office</button><small>Up / Down: read · Left / Right: choose section · A / Enter: open · B / Esc: return</small></footer>
  </section>`;
  this.body=this.root.querySelector('.production-reading')!;
  const nav=this.root.querySelector('nav')!;
  SECTIONS.forEach((label,index)=>{
   const button=document.createElement('button');button.textContent=label;button.dataset.focusKey=String(index);button.dataset.readingTarget='.production-reading';
   button.addEventListener('click',()=>this.render(index));nav.append(button);this.tabs.push(button);
  });
  const close=this.root.querySelector<HTMLButtonElement>('[data-focus-key=leave]')!;close.addEventListener('click',leave);
  this.root.querySelector('[data-total]')!.textContent=compiler.enabled?`${compiler.completed} / ${compiler.total} compiler tasks`:'Production process reference';
  this.render(0);this.controls=new DeskControls(this.root,()=>[...this.tabs,...this.body.querySelectorAll<HTMLAnchorElement>("a"),close],leave);
 }
 private text(tag:string,text:string,parent:HTMLElement=this.body){const e=document.createElement(tag);e.textContent=text;parent.append(e);return e;}
 private source(url:string,parent:HTMLElement=this.body){
  const a=document.createElement('a');a.textContent=url;a.dataset.focusKey=`source-${this.body.querySelectorAll('a').length}`;a.href=url;a.target='_blank';a.rel='noopener noreferrer';parent.append(a);
 }
 private render(index:number){
  this.tabs.forEach((button,i)=>button.setAttribute('aria-pressed',String(i===index)));
  this.body.replaceChildren();this.root.querySelector('.manuscript-body')!.scrollTop=0;
  if(index===0){
   this.text('h2',this.guidance.published?'Volume published':this.guidance.objective);
   this.text('p',this.guidance.published
    ?'Your completed volume is published. Explore the world or review your record; there is no new assignment here.'
    :"Follow the office’s gold arrow to continue your assignment.");
   if(!this.guidance.published){
    this.text('h3','Compiler milestone');
    this.text('p',this.compiler.enabled?`${this.compiler.completed} / ${this.compiler.total} SOP tasks. ${this.compiler.nextTask}.`:'Get the assignment from Kathy, then check your email at the inbox.');
   }
   this.text('h3',this.guidance.published?'Workflow reference':'Where to work');
   this.text('p','Plan at the inbox. Investigate and annotate in the Archive. Use the Archive’s east manuscript desk for selection, both reviews, revision, and DPD submission.');
   this.text('p','First review: supervisor, chapter level. Second review: GE/AGE, volume level. Revise after both; DPD handoff is not publication approval.');
  }else if(index===1){
   this.text('h2','Production process reference');
   this.text('p',`${this.board.completed} / ${this.board.total} checks recorded. These cover the wider process; use Next task for your current office action.`);
   for(const step of this.board.steps){
    const card=this.text('article','');card.dataset.status=step.complete?'complete':step.status;
    this.text('small',step.complete?'Complete':step.status==='active'?'In progress':'Not recorded',card);
    this.text('h3',step.label,card);this.text('p',step.gameplayTask,card);this.text('p',step.sourceBasis,card);this.source(step.sourceUrl,card);
   }
  }else{
   const coverage=this.board.researchCoverage;
   this.text('h2',`Source families: ${coverage.completed} / ${coverage.total}`);this.text('p',coverage.summary);
   this.text('p','This exercise checklist is not proof of exhaustive research. Check relevant collections, follow leads, and retain access gaps. Review interests do not establish where a document came from.');
   this.text('h3','Represented in the exercise');this.text('p',coverage.covered.map(l=>l.label).join(' · ')||'None yet.');
   this.text('h3','Still unrepresented');this.text('p',coverage.missing.map(l=>l.label).join(' · ')||'All exercise families are represented.');
   this.text('h3','Official process references');for(const url of this.board.sourceUrls){this.text('p',new URL(url).pathname.split('/').filter(Boolean).slice(-2).join(' / '));this.source(url);}
  }
  this.controls?.refresh(String(index));
  setChoiceState(`PRODUCTION BOARD · ${SECTIONS[index]}`,SECTIONS.map((label,i)=>({key:(['A','B','C'] as const)[i],label,value:String(i)})));
 }
 updateInput(input:InputState){this.controls.updateInput(input);}
 close(){this.controls.close();}
}
