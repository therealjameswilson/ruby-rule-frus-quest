import '../styles/manuscript-desk.css';
import { SELECTION_PACKETS, evaluateManuscriptSelection, manuscriptSelectionReadout, toggleSelectionPacket } from '../game/manuscriptSelection';
import { setChoiceState } from '../game/state';
import type { InputState } from '../input/InputState';
import { swallowNextInputFrame } from '../input/InputState';
import { retroAudio } from './audio';

/** Native-resolution reading surface over the unchanged 256x240 world. */
export class ManuscriptDesk {
  private readonly root = document.createElement('dialog');
  private readonly buttons: HTMLButtonElement[] = [];
  private focusIndex = 0;
  private armed = false;
  private readonly oldFocus = document.activeElement;
  private readonly status: HTMLElement;
  private readonly count: HTMLElement;
  private readonly remaining: HTMLElement;
  private readonly meter: HTMLElement;
  private readonly tray: HTMLElement;
  private readonly outside: HTMLElement;
  private closed = false;
  private readonly touchStyles: Array<[HTMLElement, string]> = [];
  get active() { return !this.closed; }

  constructor(private progress: Record<string,number>, private onSave:()=>void, private onSubmit:()=>void, private onCancel:()=>void) {
    this.root.className='manuscript-desk';
    this.root.setAttribute('role','dialog');this.root.setAttribute('aria-modal','true');this.root.setAttribute('aria-labelledby','manuscript-title');
    // Static authored markup; no archive/source text is interpreted as HTML.
    this.root.innerHTML=`<section class="manuscript-panel">
      <header class="manuscript-heading"><div><p class="manuscript-eyebrow">THE COMPILER’S DESK <span>01 / SELECTION</span></p><h1 id="manuscript-title">Make room for the decision.</h1><p>Select the records that carry the story. Keep useful unprinted material in the source file.</p></div><button class="manuscript-close" type="button" aria-label="Save draft and return to the archive">Save &amp; leave</button></header>
      <div class="manuscript-budget"><div><span>DOCUMENT PAGES</span><strong data-pages></strong></div><div class="manuscript-meter" role="meter" aria-label="Document page budget" aria-valuemin="0" aria-valuemax="1400"><i class="manuscript-base"></i><i data-added></i></div><p data-remaining></p><small>Annotation sheets are outside this limit.</small></div>
      <div class="manuscript-body"><section class="manuscript-candidates" aria-label="Research packets"><h2>On your desk <span>Tap a packet to place it</span></h2><div class="manuscript-packets"></div></section>
      <aside class="manuscript-trays"><div class="manuscript-bound-volume" aria-hidden="true"><span>FOREIGN<br>RELATIONS<br>OF THE<br>UNITED STATES</span><i>WORKING MANUSCRIPT</i></div><h2>In the manuscript</h2><p data-tray></p><h2>Source file</h2><p data-outside></p><p class="manuscript-danne">DANN-E: “Print everything. Bigger book, bigger genius!”</p></aside></div>
      <footer class="manuscript-footer"><p data-status role="status" aria-live="polite">Your existing manuscript has 1,100 document pages. Compare the two packets before filing.</p><button class="manuscript-submit" type="button">File selection <span>→</span></button><small>Illustrative packets • Arrows / D-pad to move · A / Enter to select · B / Esc to leave</small></footer>
    </section>`;
    this.status=this.root.querySelector('[data-status]')!;this.count=this.root.querySelector('[data-pages]')!;
    this.remaining=this.root.querySelector('[data-remaining]')!;this.meter=this.root.querySelector('.manuscript-meter')!;
    this.tray=this.root.querySelector('[data-tray]')!;this.outside=this.root.querySelector('[data-outside]')!;
    const packetHost=this.root.querySelector('.manuscript-packets')!;
    for(const packet of SELECTION_PACKETS){
      const button=document.createElement('button');button.type='button';button.className='manuscript-packet';button.dataset.packet=packet.id;
      button.innerHTML=`<span class="manuscript-folder-tab">RESEARCH PACKET <b>${packet.pages} pp.</b></span><span class="manuscript-paper"><span class="manuscript-packet-tag"></span><strong></strong><span class="manuscript-description"></span><span class="manuscript-value"></span><span class="manuscript-placement"></span></span>`;
      button.querySelector('.manuscript-packet-tag')!.textContent=packet.tag;
      button.querySelector('strong')!.textContent=packet.title;
      button.querySelector('.manuscript-description')!.textContent=packet.description;
      button.querySelector('.manuscript-value')!.textContent=packet.value;
      button.addEventListener('click',()=>{toggleSelectionPacket(this.progress,packet.id);this.onSave();retroAudio.paperPickup();this.status.textContent='Draft saved. File the selection when the manuscript is ready.';this.status.dataset.error='false';this.refresh();});
      packetHost.append(button);this.buttons.push(button);
    }
    const submit=this.root.querySelector<HTMLButtonElement>('.manuscript-submit')!;
    submit.addEventListener('click',()=>{const result=evaluateManuscriptSelection(this.progress);this.status.textContent=result.message;this.status.dataset.error=String(!result.ok);if(!result.ok){retroAudio.warning();return;}retroAudio.fileDocket();this.onSubmit();});
    const leave=this.root.querySelector<HTMLButtonElement>('.manuscript-close')!;leave.addEventListener('click',()=>this.onCancel());
    this.buttons.push(submit,leave);
    this.buttons.forEach((button,i)=>{
      button.addEventListener('focus',()=>{this.focusIndex=i;this.markFocus();});
      button.addEventListener('pointerdown',()=>button.focus({preventScroll:true}));
    });
    this.root.addEventListener('keydown',event=>{
      if(event.ctrlKey||event.metaKey||event.altKey)return;
      if(!['ArrowDown','ArrowRight','ArrowUp','ArrowLeft','Tab','Enter',' ','Escape'].includes(event.key))return;
      event.preventDefault();event.stopPropagation();if(event.repeat)return;
      if(event.key==='Escape'){this.onCancel();return;}
      if(event.key==='Enter'||event.key===' '){this.buttons[this.focusIndex].click();return;}
      this.moveFocus(event.key==='ArrowUp'||event.key==='ArrowLeft'||(event.key==='Tab'&&event.shiftKey)?-1:1,event.key==='ArrowUp'||event.key==='ArrowDown');
    });
    this.root.addEventListener('pointerdown',event=>event.stopPropagation());
    this.root.addEventListener('click',event=>event.stopPropagation());
    this.root.addEventListener('cancel',event=>{event.preventDefault();this.onCancel();});
    for(const element of [document.body,document.documentElement]) {
      this.touchStyles.push([element,element.style.touchAction]);element.style.touchAction='pan-y';
    }
    document.body.append(this.root);this.root.showModal();
    this.refresh();this.buttons[0].focus({preventScroll:true});swallowNextInputFrame();
  }
  private moveFocus(step:number, readPacket=true) {
    const current=this.buttons[this.focusIndex];
    const body=this.root.querySelector<HTMLElement>('.manuscript-body')!;
    if(readPacket&&current.dataset.packet){
      const card=current.getBoundingClientRect(), viewport=body.getBoundingClientRect();
      const clipped=step>0?card.bottom-viewport.bottom:viewport.top-card.top;
      if(clipped>4){const before=body.scrollTop;body.scrollTop+=step*Math.min(clipped+8,body.clientHeight*.75);if(Math.abs(body.scrollTop-before)>1)return;}
    }
    this.focusIndex=(this.focusIndex+step+this.buttons.length)%this.buttons.length;
    this.buttons[this.focusIndex].focus({preventScroll:true});
    this.buttons[this.focusIndex].scrollIntoView({block:'nearest',behavior:'instant'});
  }
  private markFocus(){this.buttons.forEach((b,i)=>b.dataset.focused=String(i===this.focusIndex));}
  private refresh(){
    const state=manuscriptSelectionReadout(this.progress);
    this.count.textContent=`${state.pages.toLocaleString()} / ${state.pageLimit.toLocaleString()}`;
    this.remaining.textContent=state.remaining<0?`${-state.remaining} pages over budget`:`${state.remaining} pages available`;
    this.root.dataset.over=String(state.remaining<0);this.meter.setAttribute('aria-valuenow',String(Math.min(state.pages,state.pageLimit)));this.meter.setAttribute('aria-valuetext',this.count.textContent);
    (this.root.querySelector('[data-added]') as HTMLElement).style.width=`${Math.min(300,state.pages-state.basePages)/14}%`;
    this.tray.textContent=['Existing manuscript · 1,100 pp.',...state.packets.filter(p=>p.selected).map(p=>`${p.title} · ${p.pages} pp.`)].join('\n');
    this.outside.textContent=state.packets.filter(p=>!p.selected).map(p=>p.title).join('\n')||'No packets here. Unselected material stays traceable.';
    state.packets.forEach((packet,i)=>{this.buttons[i].setAttribute('aria-pressed',String(packet.selected));this.buttons[i].querySelector('.manuscript-placement')!.textContent=packet.selected?'✓ In manuscript · tap to return to source file':'+ Place in manuscript';});
    setChoiceState(`MANUSCRIPT DESK · ${state.pages}/${state.pageLimit} document pages`,[
      {key:'A',label:'Move a packet between manuscript and source file',value:'move'},
      {key:'B',label:'Save draft and leave',value:'leave'},
      {key:'C',label:'File selection',value:'file'}
    ]);
  }
  updateInput(input:InputState){
    if(!this.active)return;
    if(!this.armed){if(!input.a&&!input.b&&!input.up&&!input.down&&!input.left&&!input.right&&!input.confirmJustPressed&&!input.cancelJustPressed)this.armed=true;return;}
    if(input.bJustPressed||input.cancelJustPressed||input.pauseJustPressed||input.menuJustPressed){this.onCancel();return;}
    if(input.navDownJustPressed||input.navRightJustPressed)this.moveFocus(1,input.navDownJustPressed);
    else if(input.navUpJustPressed||input.navLeftJustPressed)this.moveFocus(-1,input.navUpJustPressed);
    else if(input.aJustPressed||input.confirmJustPressed)this.buttons[this.focusIndex].click();
  }
  close(){if(this.closed)return;this.closed=true;this.root.close();this.root.remove();for(const [element,value] of this.touchStyles)element.style.touchAction=value;if(this.oldFocus instanceof HTMLElement&&this.oldFocus.isConnected)this.oldFocus.focus({preventScroll:true});swallowNextInputFrame();}
}
