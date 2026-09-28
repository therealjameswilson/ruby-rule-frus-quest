import type Phaser from "phaser";
import {clearChoiceState,setChoiceState,setLatestMessage} from "../game/state";
import {RELEASE_SCOPE_TITLE,RELEASE_SCOPE_PARTS,restoreReleaseScope,toggleReleaseScope,validateReleaseScope,type ReleaseScopePart} from "../game/releaseScope";
import {getInput,swallowNextInputFrame} from "../input/InputState";
import {retroAudio} from "./audio";
import {CHOICE_PROMPT_OPEN_EVENT} from "./verification";
import {ReleaseScopeDesk} from "./releaseScopeDesk";

export class ReleaseScopeBoard {
  private view?:ReleaseScopeDesk;
  private mask=7;
  private message='';
  private onChange?:(mask:number)=>void;
  private onFile?:(mask:number)=>void;
  constructor(private readonly scene:Phaser.Scene){scene.events.once('shutdown',()=>this.hide());}
  get active(){return this.view?.active??false;}
  show(mask:number|undefined,onChange:(mask:number)=>void,onFile:(mask:number)=>void){
    this.hide();this.scene.events.emit(CHOICE_PROMPT_OPEN_EVENT);
    this.mask=restoreReleaseScope(mask);this.onChange=onChange;this.onFile=onFile;
    this.message=mask===undefined?'Check the draft markings against the release note.':'Draft kept — not filed.';
    this.view=new ReleaseScopeDesk(part=>this.toggle(part),()=>this.submit(),()=>this.hide());
    this.refresh();swallowNextInputFrame();
  }
  updateInput(){if(this.active)this.view!.updateInput(getInput());}
  private toggle(part:ReleaseScopePart){
    if(!this.active)return;this.mask=toggleReleaseScope(this.mask,part);this.onChange?.(this.mask);
    this.message='Draft edited — not filed. The release note is unchanged.';retroAudio.annotatePaper();this.refresh();
  }
  private submit(){
    if(!this.active)return;const result=validateReleaseScope(this.mask);
    if(!result.ok){this.message=result.message;this.refresh(true);setLatestMessage(result.message);retroAudio.warning();return;}
    this.hide();this.onFile?.(this.mask);
  }
  private hide(){if(!this.active)return;this.view!.close();this.view=undefined;clearChoiceState();swallowNextInputFrame();}
  private refresh(error=false){
    this.view?.render(this.mask,this.message,error);
    setChoiceState(RELEASE_SCOPE_TITLE,RELEASE_SCOPE_PARTS.map((part,index)=>({key:(["A","B","C"] as const)[index],label:part.label,value:this.mask&(1<<index)?'print':'hold'})));
  }
}
