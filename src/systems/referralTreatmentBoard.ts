import type Phaser from "phaser";
import {clearChoiceState,setChoiceState,setLatestMessage} from "../game/state";
import {TREATMENT_REVIEW_TITLE,toggleTreatmentField,treatmentDraftProblem,type TreatmentDraft} from "../game/referralTreatmentDraft";
import {getInput,swallowNextInputFrame} from "../input/InputState";
import {retroAudio} from "./audio";
import {CHOICE_PROMPT_OPEN_EVENT} from "./verification";
import {ReferralTreatmentDesk} from "./referralTreatmentDesk";
export class ReferralTreatmentBoard {
 private view?:ReferralTreatmentDesk;
 private draft:TreatmentDraft={permission:'PRINT',withholding:'OMIT'};
 private message='';
 private changed?:(draft:TreatmentDraft)=>void;
 private filed?:()=>void;
 constructor(private readonly scene:Phaser.Scene){scene.events.once('shutdown',()=>this.hide());}
 get active(){return this.view?.active??false;}
 show(draft:TreatmentDraft,changed:(draft:TreatmentDraft)=>void,filed:()=>void){
  this.hide();this.scene.events.emit(CHOICE_PROMPT_OPEN_EVENT);
  this.draft={...draft};this.changed=changed;this.filed=filed;this.message='Compare the draft treatment with the case notes.';
  this.view=new ReferralTreatmentDesk(field=>this.toggle(field),()=>this.submit(),()=>this.hide());
  this.refresh();swallowNextInputFrame();
 }
 updateInput(){if(this.active)this.view!.updateInput(getInput());}
 private toggle(field:keyof TreatmentDraft){
  if(!this.active)return;this.draft=toggleTreatmentField(this.draft,field);this.changed?.({...this.draft});
  this.message='Draft edited — not filed.';retroAudio.annotatePaper();this.refresh();
 }
 private submit(){
  if(!this.active)return;const problem=treatmentDraftProblem(this.draft);
  if(problem){this.message=problem.replace('\n','. ');this.refresh(true);setLatestMessage(this.message);retroAudio.warning();return;}
  this.hide();this.filed?.();
 }
 private hide(){if(!this.active)return;this.view!.close();this.view=undefined;clearChoiceState();swallowNextInputFrame();}
 private refresh(error=false){
  this.view?.render(this.draft,this.message,error);
  setChoiceState(TREATMENT_REVIEW_TITLE,[
   {key:'A',label:`FOREIGN NOTE: ${this.draft.permission}`,value:this.draft.permission},
   {key:'B',label:`WITHHELD FILE: ${this.draft.withholding}`,value:this.draft.withholding}
  ]);
 }
}
