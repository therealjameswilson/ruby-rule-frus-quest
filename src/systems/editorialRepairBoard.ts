import type Phaser from "phaser";
import { EDITORIAL_RECHECK_TITLE, EDITORIAL_REPAIR_TITLE, type EditorialRepairRecord } from "../game/editorialRepair";
import { clearChoiceState, setChoiceState, setLatestMessage } from "../game/state";
import { getInput, swallowNextInputFrame } from "../input/InputState";
import { retroAudio } from "./audio";
import { CHOICE_PROMPT_OPEN_EVENT } from "./verification";
import { EditorialRepairDesk } from "./editorialRepairDesk";

export class EditorialRepairBoard {
 private view?:EditorialRepairDesk;
 private repaired=false;
 private proof=false;
 private record?:EditorialRepairRecord;
 private message='';
 private onChange?:()=>void;
 private onFile?:()=>void;
 constructor(private readonly scene:Phaser.Scene){scene.events.once('shutdown',()=>this.hide());}
 get active(){return this.view?.active??false;}
 show(record:EditorialRepairRecord,repaired:boolean,proof:boolean,onChange:()=>void,onFile:()=>void){
  this.hide();this.scene.events.emit(CHOICE_PROMPT_OPEN_EVENT);
  this.record=record;this.repaired=repaired;this.proof=proof;this.onChange=onChange;this.onFile=onFile;
  this.message=proof?'Compare the filed indication with the retained evidence.':repaired?'Indication restored — draft not yet filed.':'The reader cannot see that text was withheld.';
  this.view=new EditorialRepairDesk(record,proof,()=>this.repair(),()=>this.submit(),()=>this.hide());
  this.refresh();swallowNextInputFrame();
 }
 updateInput(){if(this.active)this.view!.updateInput(getInput());}
 private repair(){
  if(!this.active||this.repaired||this.proof)return;
  this.repaired=true;this.onChange?.();retroAudio.annotatePaper();
  this.message='Italic indication restored. File the draft, then check it at the proof table.';this.refresh();
 }
 private submit(){
  if(!this.active)return;
  if(!this.repaired){
   this.message=this.proof?'Return to the editor desk to restore the missing indication.':'Add the missing withholding indication before filing.';
   this.refresh(true);setLatestMessage('The retained note records withheld text. Restore its indication before filing the proof.');retroAudio.warning();return;
  }
  this.hide();this.onFile?.();
 }
 private hide(){if(!this.active)return;this.view!.close();this.view=undefined;clearChoiceState();swallowNextInputFrame();}
 private refresh(error=false){
  if(!this.record)return;
  this.view?.render(this.repaired,this.message,error);
  setChoiceState(`${this.proof?EDITORIAL_RECHECK_TITLE:EDITORIAL_REPAIR_TITLE} ${this.record.label}. ${this.record.evidence}. Fictional training record.`,[
   {key:'A',label:this.repaired?this.record.indication:'Add withholding indication',value:this.repaired?'visible_italic':'missing'},
   {key:'B',label:this.proof?'FILE PROOF':'FILE DRAFT',value:this.proof?'file_proof':'file_draft'},
   {key:'C',label:'RETURN',value:'cancel'}
  ]);
 }
}
