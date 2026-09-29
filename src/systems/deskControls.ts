import {retroAudio} from './audio';
import type {InputState} from '../input/InputState';
import {swallowNextInputFrame} from '../input/InputState';

/** Shared native-resolution desk input, focus, scrolling, and modal lifecycle. */
export class DeskControls {
  private focusIndex=0;
  private armed=false;
  private closed=false;
  private releaseReadingMix?:()=>void;
  private readonly oldFocus=document.activeElement;
  private readonly touchStyles:Array<[HTMLElement,string]>=[];
  private readonly bound=new WeakSet<HTMLButtonElement>();
  private buttons:HTMLButtonElement[]=[];
  get active(){return !this.closed;}
  get focusedKey(){return this.buttons[this.focusIndex]?.dataset.focusKey;}
  private readonly fullscreenChanged=()=>{
    if(this.closed)return;
    const focused=this.buttons[this.focusIndex];
    this.root.close();this.root.showModal();focused?.focus({preventScroll:true});
  };
  constructor(private root:HTMLDialogElement,private getButtons:()=>HTMLButtonElement[],private onCancel:()=>void){
    this.refresh();
    this.root.addEventListener('keydown',event=>{
      if(event.ctrlKey||event.metaKey||event.altKey)return;
      if(!['ArrowDown','ArrowRight','ArrowUp','ArrowLeft','Tab','Enter',' ','Escape'].includes(event.key))return;
      event.preventDefault();event.stopPropagation();if(event.repeat)return;
      if(event.key==='Escape'){this.onCancel();return;}
      if(event.key==='Enter'||event.key===' '){this.buttons[this.focusIndex]?.click();return;}
      this.moveFocus(event.key==='ArrowUp'||event.key==='ArrowLeft'||(event.key==='Tab'&&event.shiftKey)?-1:1,event.key==='ArrowUp'||event.key==='ArrowDown');
    });
    // A movement gesture can open this modal before its touchend. Accept a
    // pointer click only if that gesture started inside the desk; keyboard and
    // controller/programmatic activation retain their zero-detail clicks.
    let pointerClickReady=false;
    this.root.addEventListener('pointerdown',()=>{pointerClickReady=true;},{capture:true});
    this.root.addEventListener('pointercancel',()=>{pointerClickReady=false;},{capture:true});
    this.root.addEventListener('click',event=>{
      if(event.detail>0&&!pointerClickReady){event.preventDefault();event.stopImmediatePropagation();}
      pointerClickReady=false;
    },{capture:true});
    this.root.addEventListener('pointerdown',event=>event.stopPropagation());
    this.root.addEventListener('click',event=>event.stopPropagation());
    this.root.addEventListener('cancel',event=>{event.preventDefault();this.onCancel();});
    for(const element of [document.body,document.documentElement]){this.touchStyles.push([element,element.style.touchAction]);element.style.touchAction='pan-y';}
    document.body.append(this.root);this.root.showModal();
    this.releaseReadingMix=retroAudio.holdReadingMix();
    document.addEventListener('fullscreenchange',this.fullscreenChanged);
    this.buttons[0]?.focus({preventScroll:true});swallowNextInputFrame();
  }
  refresh(preferredKey?:string){
    this.buttons=this.getButtons().filter(b=>!b.disabled);
    for(const button of this.buttons){
      if(this.bound.has(button))continue;this.bound.add(button);
      button.addEventListener('focus',()=>{this.focusIndex=this.buttons.indexOf(button);this.markFocus();});
      button.addEventListener('pointerdown',()=>button.focus({preventScroll:true}));
    }
    if(preferredKey!==undefined){const target=this.buttons.find(b=>b.dataset.focusKey===preferredKey)??this.buttons[0];target?.focus({preventScroll:true});target?.scrollIntoView({block:'nearest',behavior:'instant'});}
    this.focusIndex=Math.max(0,Math.min(this.focusIndex,this.buttons.length-1));this.markFocus();
  }
  private markFocus(){this.buttons.forEach((b,i)=>b.dataset.focused=String(i===this.focusIndex));}
  private moveFocus(step:number,readPacket=true){
    const current=this.buttons[this.focusIndex];if(!current)return;
    const body=this.root.querySelector<HTMLElement>('.manuscript-body')!;
    const readable=(current.dataset.readingTarget?this.root.querySelector<HTMLElement>(current.dataset.readingTarget):null)
      ??current.closest<HTMLElement>('[data-readable]')??(current.dataset.packet?current:null);
    if(readPacket&&readable){
      const card=readable.getBoundingClientRect(),viewport=body.getBoundingClientRect();
      // A reading prelude belongs to the first packet. Up must reveal it,
      // rather than wrapping focus away before a controller user can read it.
      const prelude=this.focusIndex===0?this.root.querySelector<HTMLElement>('[data-reading-start]'):null;
      const top=prelude?Math.min(card.top,prelude.getBoundingClientRect().top):card.top;
      const clipped=step>0?card.bottom-viewport.bottom:viewport.top-top;
      if(clipped>4){const before=body.scrollTop;body.scrollTop+=step*Math.min(clipped+8,body.clientHeight*.75);if(Math.abs(body.scrollTop-before)>1)return;}
    }
    const previousIndex=this.focusIndex;
    this.focusIndex=(this.focusIndex+step+this.buttons.length)%this.buttons.length;
    this.buttons[this.focusIndex].focus({preventScroll:true});this.buttons[this.focusIndex].scrollIntoView({block:'nearest',behavior:'instant'});
    if(this.focusIndex!==previousIndex)retroAudio.deskNavigate();
  }
  updateInput(input:InputState){
    if(!this.active)return;
    if(!this.armed){if(!input.a&&!input.b&&!input.up&&!input.down&&!input.left&&!input.right&&!input.confirmJustPressed&&!input.cancelJustPressed)this.armed=true;return;}
    if(input.bJustPressed||input.cancelJustPressed||input.pauseJustPressed||input.menuJustPressed){this.onCancel();return;}
    if(input.navDownJustPressed||input.navRightJustPressed)this.moveFocus(1,input.navDownJustPressed);
    else if(input.navUpJustPressed||input.navLeftJustPressed)this.moveFocus(-1,input.navUpJustPressed);
    else if(input.aJustPressed||input.confirmJustPressed)this.buttons[this.focusIndex]?.click();
  }
  close(){
    if(this.closed)return;this.closed=true;document.removeEventListener('fullscreenchange',this.fullscreenChanged);
    this.releaseReadingMix?.();this.root.close();this.root.remove();for(const [element,value] of this.touchStyles)element.style.touchAction=value;
    if(this.oldFocus instanceof HTMLElement&&this.oldFocus.isConnected)this.oldFocus.focus({preventScroll:true});swallowNextInputFrame();
  }
}
